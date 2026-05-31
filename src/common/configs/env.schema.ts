import { z } from 'zod';

const numberFromString = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}, z.number());

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: numberFromString.default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export type Env = z.infer<typeof envSchema>;
