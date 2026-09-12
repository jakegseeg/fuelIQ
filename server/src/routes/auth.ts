import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './_helpers.js';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { createUser, findByEmail, findById, toPublic } from '../db/userRepo.js';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid credentials', issues: parsed.error.flatten() });
      return;
    }
    const { email, password } = parsed.data;
    if (findByEmail(email)) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }
    const user = createUser(email, await hashPassword(password));
    const token = signToken(user.id, user.email);
    res.status(201).json({ token, user: toPublic(user) });
  }),
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }
    const { email, password } = parsed.data;
    const user = findByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken(user.id, user.email);
    res.json({ token, user: toPublic(user) });
  }),
);

// POST /api/auth/logout — stateless JWT; client discards the token.
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = req.userId ? findById(req.userId) : null;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublic(user) });
});

export default router;
