import { clerkMiddleware, getAuth } from '@clerk/express';
import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../lib/http-errors';

/**
 * Turns a request into the id of the signed-in user, or null.
 * Production always uses {@link clerkAuth}; tests inject their own resolver.
 */
export type AuthStrategy = {
  middleware: RequestHandler[];
  resolveUserId: (req: Request) => string | null;
};

export function clerkAuth(options: {
  secretKey: string;
  publishableKey: string;
  authorizedParties: string[];
}): AuthStrategy {
  return {
    middleware: [
      clerkMiddleware({
        secretKey: options.secretKey,
        publishableKey: options.publishableKey,
        ...(options.authorizedParties.length ? { authorizedParties: options.authorizedParties } : {}),
      }),
    ],
    resolveUserId: (req) => getAuth(req).userId ?? null,
  };
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Rejects requests without a verified session and stores the user id on the request. */
export function requireUser(resolveUserId: AuthStrategy['resolveUserId']): RequestHandler {
  return (req, _res, next) => {
    const userId = resolveUserId(req);
    if (!userId) {
      next(unauthorized());
      return;
    }
    req.userId = userId;
    next();
  };
}

export function userIdOf(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
