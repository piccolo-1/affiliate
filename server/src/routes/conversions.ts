import { Router, Response } from 'express';
import db from '../database/schema';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get conversions for affiliate
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT c.*, o.name as offer_name
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      WHERE c.affiliate_id = ?
    `;
    const params: any[] = [req.user!.id];

    if (startDate) {
      query += ' AND DATE(c.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(c.created_at) <= ?';
      params.push(endDate);
    }

    if (offerId) {
      query += ' AND c.offer_id = ?';
      params.push(offerId);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const conversions = db.prepare(query).all(...params) as any[];

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM conversions WHERE affiliate_id = ?';
    const countParams: any[] = [req.user!.id];
    if (startDate) {
      countQuery += ' AND DATE(created_at) >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND DATE(created_at) <= ?';
      countParams.push(endDate);
    }
    if (offerId) {
      countQuery += ' AND offer_id = ?';
      countParams.push(offerId);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    const total = (db.prepare(countQuery).get(...countParams) as any).total;

    // Get summary stats
    const summaryQuery = `
      SELECT
        COUNT(*) as total_conversions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'approved' THEN payout ELSE 0 END) as total_payout,
        SUM(CASE WHEN status = 'pending' THEN payout ELSE 0 END) as pending_payout
      FROM conversions WHERE affiliate_id = ?
    `;
    const summary = db.prepare(summaryQuery).get(req.user!.id) as any;

    res.json({
      conversions: conversions.map(c => ({
        id: c.id,
        clickId: c.click_id,
        conversionId: c.conversion_id,
        offerId: c.offer_id,
        offerName: c.offer_name,
        eventType: c.event_type,
        status: c.status,
        revenue: c.revenue,
        payout: c.payout,
        saleAmount: c.sale_amount,
        sub1: c.sub1,
        sub2: c.sub2,
        sub3: c.sub3,
        sub4: c.sub4,
        sub5: c.sub5,
        country: c.country,
        transactionId: c.transaction_id,
        notes: c.notes,
        rejectionReason: c.rejection_reason,
        createdAt: c.created_at
      })),
      summary: {
        totalConversions: summary.total_conversions,
        approved: summary.approved,
        pending: summary.pending,
        rejected: summary.rejected,
        totalPayout: summary.total_payout || 0,
        pendingPayout: summary.pending_payout || 0
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get conversions error:', error);
    res.status(500).json({ error: 'Failed to get conversions' });
  }
});

// Get single conversion details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const conversion = db.prepare(`
      SELECT c.*, o.name as offer_name, cl.user_agent, cl.device_type, cl.browser_name, cl.os_name
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      LEFT JOIN clicks cl ON c.click_id = cl.click_id
      WHERE c.id = ? AND c.affiliate_id = ?
    `).get(id, req.user!.id) as any;

    if (!conversion) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    res.json({
      id: conversion.id,
      clickId: conversion.click_id,
      conversionId: conversion.conversion_id,
      offerId: conversion.offer_id,
      offerName: conversion.offer_name,
      eventType: conversion.event_type,
      status: conversion.status,
      revenue: conversion.revenue,
      payout: conversion.payout,
      saleAmount: conversion.sale_amount,
      sub1: conversion.sub1,
      sub2: conversion.sub2,
      sub3: conversion.sub3,
      sub4: conversion.sub4,
      sub5: conversion.sub5,
      country: conversion.country,
      ipAddress: conversion.ip_address,
      deviceType: conversion.device_type,
      browser: conversion.browser_name,
      os: conversion.os_name,
      transactionId: conversion.transaction_id,
      advertiserRef: conversion.advertiser_ref,
      notes: conversion.notes,
      rejectionReason: conversion.rejection_reason,
      createdAt: conversion.created_at,
      updatedAt: conversion.updated_at
    });
  } catch (error) {
    console.error('Get conversion error:', error);
    res.status(500).json({ error: 'Failed to get conversion' });
  }
});

export default router;
