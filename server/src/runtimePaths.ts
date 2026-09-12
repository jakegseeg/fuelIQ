import path from 'node:path';

export const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;

const runtimeRoot = isVercel ? path.join('/tmp', 'fueliq') : null;

export function dataDir(defaultDir: string): string {
  return runtimeRoot ? path.join(runtimeRoot, 'data') : defaultDir;
}

export function uploadsDir(defaultDir: string): string {
  return runtimeRoot ? path.join(runtimeRoot, 'uploads') : defaultDir;
}
