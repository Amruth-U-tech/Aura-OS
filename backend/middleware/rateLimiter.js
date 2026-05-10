import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    sendError(res, 'Too many requests from this IP, please try again later.', 'RATE_LIMIT_EXCEEDED', options.statusCode);
  }
});
