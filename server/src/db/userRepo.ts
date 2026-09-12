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
  email: string;
  createdAt: string;
}

export function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export function findByEmail(email: string): UserRow | null {
  const row = db.get<UserRow>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return row ?? null;
}

export function findById(id: string): UserRow | null {
  const row = db.get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ?? null;
}

export function createUser(email: string, passwordHash: string): UserRow {
  const id = randomUUID();
  db.run('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [
    id,
    email.toLowerCase(),
    passwordHash,
  ]);
  return findById(id)!;
}
