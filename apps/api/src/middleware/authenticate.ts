import type { NextFunction, Request, Response } from 'express';

import { UserModel } from '../models/User.js';
import { UnauthorizedError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/verifyTokens.js';

/**
 * Validates Bearer access JWT and ensures the user still has an active server session.
 * Logout clears `refreshSession`, which invalidates access tokens before JWT expiry.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const [kind, token] = header.split(' ');
  if (kind !== 'Bearer' || !token) {
    next(new UnauthorizedError());
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub)
      .select({ 'refreshSession.hashedJti': 1 })
      .lean();
    if (!user?.refreshSession?.hashedJti) {
      next(new UnauthorizedError('UNAUTHORIZED', 'جلسة منتهية', 'Session expired.'));
      return;
    }
    req.auth = {
      userId: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('UNAUTHORIZED', 'جلسة منتهية', 'Session expired.'));
  }
}
