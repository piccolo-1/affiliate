import { v4 as uuidv4 } from 'uuid';
import db from '../database/schema';

// Retry intervals in seconds using exponential backoff
// Retry 1: 30 seconds, Retry 2: 2 minutes, Retry 3: 10 minutes, Retry 4: 1 hour, Retry 5: 4 hours
const RETRY_INTERVALS = [30, 120, 600, 3600, 14400];
const MAX_RETRIES = 5;

interface PostbackQueueItem {
  id: string;
  postback_url_id: string;
  conversion_id: string;
  click_id: string;
  affiliate_id: string;
  offer_id: string;
  event_type: string;
  payout: number;
  revenue: number;
  sub1: string | null;
  sub2: string | null;
  sub3: string | null;
  sub4: string | null;
  sub5: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  last_error: string | null;
  status: string;
}

interface PostbackUrl {
  id: string;
  url: string;
  method: string;
}

// Add a failed postback to the retry queue
export function queuePostbackRetry(
  postbackUrlId: string,
  conversionId: string,
  clickData: {
    click_id: string;
    affiliate_id: string;
    offer_id: string;
    sub1?: string | null;
    sub2?: string | null;
    sub3?: string | null;
    sub4?: string | null;
    sub5?: string | null;
  },
  event: string,
  payout: number,
  revenue: number,
  errorMessage: string
): void {
  const id = uuidv4();
  const nextRetryAt = new Date(Date.now() + RETRY_INTERVALS[0] * 1000).toISOString();

  db.prepare(`
    INSERT INTO postback_retry_queue (
      id, postback_url_id, conversion_id, click_id, affiliate_id, offer_id,
      event_type, payout, revenue, sub1, sub2, sub3, sub4, sub5,
      retry_count, max_retries, next_retry_at, last_error, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'pending')
  `).run(
    id, postbackUrlId, conversionId, clickData.click_id, clickData.affiliate_id, clickData.offer_id,
    event, payout, revenue,
    clickData.sub1 || null, clickData.sub2 || null, clickData.sub3 || null,
    clickData.sub4 || null, clickData.sub5 || null,
    MAX_RETRIES, nextRetryAt, errorMessage
  );

  console.log(`[PostbackRetry] Queued retry for conversion ${conversionId}, next retry at ${nextRetryAt}`);
}

// Process pending retries
export async function processRetryQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const now = new Date().toISOString();

  // Get items that are due for retry
  const pendingItems = db.prepare(`
    SELECT * FROM postback_retry_queue
    WHERE status = 'pending' AND next_retry_at <= ?
    ORDER BY next_retry_at ASC
    LIMIT 50
  `).all(now) as PostbackQueueItem[];

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    processed++;

    // Mark as processing
    db.prepare(`
      UPDATE postback_retry_queue SET status = 'processing', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(item.id);

    // Get the postback URL details
    const postbackUrl = db.prepare(`
      SELECT * FROM postback_urls WHERE id = ?
    `).get(item.postback_url_id) as PostbackUrl | undefined;

    if (!postbackUrl) {
      // Postback URL no longer exists, mark as failed
      db.prepare(`
        UPDATE postback_retry_queue SET status = 'failed', last_error = 'Postback URL no longer exists', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(item.id);
      failed++;
      continue;
    }

    // Build the URL with placeholders replaced
    let url = postbackUrl.url;
    url = url.replace('{click_id}', item.click_id || '');
    url = url.replace('{conversion_id}', item.conversion_id);
    url = url.replace('{payout}', item.payout.toString());
    url = url.replace('{revenue}', item.revenue.toString());
    url = url.replace('{sub1}', item.sub1 || '');
    url = url.replace('{sub2}', item.sub2 || '');
    url = url.replace('{sub3}', item.sub3 || '');
    url = url.replace('{sub4}', item.sub4 || '');
    url = url.replace('{sub5}', item.sub5 || '');
    url = url.replace('{offer_id}', item.offer_id || '');
    url = url.replace('{event}', item.event_type);

    try {
      const response = await fetch(url, {
        method: postbackUrl.method || 'GET',
        headers: { 'User-Agent': 'AffiliateNetwork/1.0' }
      });

      if (response.ok) {
        // Success! Mark as completed
        db.prepare(`
          UPDATE postback_retry_queue SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(item.id);

        // Log successful retry
        db.prepare(`
          INSERT INTO postback_logs (id, postback_url_id, conversion_id, request_url, response_code, success, retry_count)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(uuidv4(), item.postback_url_id, item.conversion_id, url, response.status, item.retry_count + 1);

        succeeded++;
        console.log(`[PostbackRetry] Success for conversion ${item.conversion_id} on retry #${item.retry_count + 1}`);
      } else {
        // HTTP error, schedule next retry or mark as failed
        await handleRetryFailure(item, `HTTP ${response.status}`, url);
        failed++;
      }
    } catch (err: any) {
      // Network error, schedule next retry or mark as failed
      await handleRetryFailure(item, err.message, url);
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

// Handle a failed retry attempt
async function handleRetryFailure(item: PostbackQueueItem, errorMessage: string, url: string): Promise<void> {
  const newRetryCount = item.retry_count + 1;

  // Log the failed attempt
  db.prepare(`
    INSERT INTO postback_logs (id, postback_url_id, conversion_id, request_url, success, error_message, retry_count)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(uuidv4(), item.postback_url_id, item.conversion_id, url, errorMessage, newRetryCount);

  if (newRetryCount >= item.max_retries) {
    // Max retries reached, mark as failed permanently
    db.prepare(`
      UPDATE postback_retry_queue SET
        status = 'failed',
        retry_count = ?,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newRetryCount, errorMessage, item.id);

    console.log(`[PostbackRetry] Max retries reached for conversion ${item.conversion_id}, marking as failed`);
  } else {
    // Schedule next retry with exponential backoff
    const intervalIndex = Math.min(newRetryCount, RETRY_INTERVALS.length - 1);
    const nextRetryAt = new Date(Date.now() + RETRY_INTERVALS[intervalIndex] * 1000).toISOString();

    db.prepare(`
      UPDATE postback_retry_queue SET
        status = 'pending',
        retry_count = ?,
        next_retry_at = ?,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newRetryCount, nextRetryAt, errorMessage, item.id);

    console.log(`[PostbackRetry] Scheduled retry #${newRetryCount + 1} for conversion ${item.conversion_id} at ${nextRetryAt}`);
  }
}

// Get retry queue statistics
export function getRetryQueueStats(): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
} {
  const stats = db.prepare(`
    SELECT
      status,
      COUNT(*) as count
    FROM postback_retry_queue
    GROUP BY status
  `).all() as { status: string; count: number }[];

  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  for (const stat of stats) {
    if (stat.status in result) {
      result[stat.status as keyof typeof result] = stat.count;
    }
  }

  return result;
}

// Clean up old completed/failed entries (older than 30 days)
export function cleanupOldEntries(): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const result = db.prepare(`
    DELETE FROM postback_retry_queue
    WHERE status IN ('completed', 'failed') AND updated_at < ?
  `).run(thirtyDaysAgo);

  return result.changes;
}

// Start the retry worker (runs every 30 seconds)
let retryWorkerInterval: NodeJS.Timeout | null = null;

export function startRetryWorker(): void {
  if (retryWorkerInterval) {
    console.log('[PostbackRetry] Worker already running');
    return;
  }

  console.log('[PostbackRetry] Starting retry worker...');

  // Process immediately on start
  processRetryQueue().then(result => {
    if (result.processed > 0) {
      console.log(`[PostbackRetry] Initial run: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed`);
    }
  });

  // Then run every 30 seconds
  retryWorkerInterval = setInterval(async () => {
    try {
      const result = await processRetryQueue();
      if (result.processed > 0) {
        console.log(`[PostbackRetry] ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('[PostbackRetry] Worker error:', error);
    }
  }, 30000);
}

export function stopRetryWorker(): void {
  if (retryWorkerInterval) {
    clearInterval(retryWorkerInterval);
    retryWorkerInterval = null;
    console.log('[PostbackRetry] Worker stopped');
  }
}
