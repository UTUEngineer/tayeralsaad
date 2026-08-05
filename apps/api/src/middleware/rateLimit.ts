import rateLimit, { type Options } from 'express-rate-limit';

import { env } from '../config/env.js';
import { HTTP } from '../constants.js';
import { sendFail } from '../utils/apiResponse.js';

const rateLimited: Options['handler'] = (_req, res) => {
  sendFail(res, HTTP.TOO_MANY_REQUESTS, {
    code: 'RATE_LIMITED',
    message: 'عدد كبير من الطلبات، حاول لاحقًا',
    messageEn: 'Too many requests, please try again later.',
  });
};

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimited,
} as const;

/** Coarse per-IP limit for the whole API to blunt scraping / abuse. */
export const generalRateLimiter = rateLimit({
  ...base,
  windowMs: 5 * 60 * 1000,
  limit: 300,
});

const devSkip = (): boolean => env.NODE_ENV !== 'production';

/** Per-IP cap on OTP issuance — complements the per-phone limiter to stop SMS abuse. */
export const otpRequestIpRateLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  skip: devSkip,
});

/** Per-IP cap on OTP verification to stop code brute-forcing. */
export const otpVerifyRateLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  limit: 15,
  skip: devSkip,
});
