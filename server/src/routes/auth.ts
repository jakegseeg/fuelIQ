import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './_helpers.js';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { createUser, findById, findByUsername, toPublic } from '../db/userRepo.js';

const router = Router();

const credentialsSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(40).optional(),
  email: z.string().trim().min(3).max(80).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).transform((value, ctx) => {
  const username = value.username || value.email;
  if (!username) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['username'],
      message: 'Username is required',
    });
    return z.NEVER;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['username'],
      message: 'Use letters, numbers, dots, dashes, or underscores only',
    });
    return z.NEVER;
  }
  return { username, password: value.password };
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
    const { username, password } = parsed.data;
    if (findByUsername(username)) {
      res.status(409).json({ error: 'An account with that username already exists' });
      return;
    }
    const user = createUser(username, await hashPassword(password));
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
    const { username, password } = parsed.data;
    const user = findByUsername(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid username or password' });
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
