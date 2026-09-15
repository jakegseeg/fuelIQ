import { randomUUID } from 'node:crypto';
import { db } from './index.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export function toPublic(row: UserRow): PublicUser {
  return { id: row.id, username: row.email, email: row.email, createdAt: row.created_at };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function findByUsername(username: string): UserRow | null {
  const row = db.get<UserRow>('SELECT * FROM users WHERE email = ?', [normalizeUsername(username)]);
  return row ?? null;
}

export function findById(id: string): UserRow | null {
  const row = db.get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ?? null;
}

export function createUser(username: string, passwordHash: string): UserRow {
  const id = randomUUID();
  db.run('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [
    id,
    normalizeUsername(username),
    passwordHash,
  ]);
  return findById(id)!;
}
