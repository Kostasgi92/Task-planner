import { createDb } from '@tasknest/db';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { clerkAuth } from './middleware/auth';

/** The real app: Clerk-verified sessions + Postgres. Shared by the Node server and Vercel. */
export function createProductionApp() {
  const env = loadEnv();
  const { db } = createDb(env.DATABASE_URL);
  return createApp({
    db,
    auth: clerkAuth({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      authorizedParties: env.CLERK_AUTHORIZED_PARTIES,
    }),
  });
}
