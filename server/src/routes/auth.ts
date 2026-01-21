import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { generateToken, authenticate, AuthRequest, AuthUser } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  validate,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../middleware/validation';

const router = Router();

// Generate a unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Register new affiliate
router.post('/register', authRateLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, company, referralCode } = req.body;

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find referrer if referral code provided
    let referrerId = null;
    if (referralCode) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode) as any;
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user
    const userId = uuidv4();
    const userReferralCode = generateReferralCode();

    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code, referred_by)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'active', ?, ?)
    `).run(userId, email, hashedPassword, firstName, lastName, company || null, userReferralCode, referrerId);

    // Generate token
    const user: AuthUser = {
      id: userId,
      email,
      role: 'affiliate',
      firstName,
      lastName
    };
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        company,
        role: 'affiliate',
        referralCode: userReferralCode
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', authRateLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = db.prepare(`
      SELECT id, email, password, first_name, last_name, company, role, status, referral_code
      FROM users WHERE email = ?
    `).get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account is ${user.status}` });
    }

    // Generate token
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };
    const token = generateToken(authUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        role: user.role,
        referralCode: user.referral_code
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, company, role, status, referral_code,
             payout_method, payout_details, minimum_payout, created_at
      FROM users WHERE id = ?
    `).get(req.user!.id) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      role: user.role,
      status: user.status,
      referralCode: user.referral_code,
      payoutMethod: user.payout_method,
      payoutDetails: user.payout_details,
      minimumPayout: user.minimum_payout,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
router.put('/profile', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, company, payoutMethod, payoutDetails, minimumPayout } = req.body;

    db.prepare(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        company = COALESCE(?, company),
        payout_method = COALESCE(?, payout_method),
        payout_details = COALESCE(?, payout_details),
        minimum_payout = COALESCE(?, minimum_payout),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(firstName, lastName, company, payoutMethod, payoutDetails, minimumPayout, req.user!.id);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticate, validate(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user!.id) as any;

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, req.user!.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
