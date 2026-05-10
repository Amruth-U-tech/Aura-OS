import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]', err.stack || err);
  
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid resource ID';
    errorCode = 'INVALID_ID';
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Syntax Error (e.g. malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload';
    errorCode = 'MALFORMED_JSON';
  }

  sendError(res, message, errorCode, statusCode);
};

export const notFoundHandler = (req, res, next) => {
  res.status(404);
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.errorCode = 'NOT_FOUND';
  next(error);
};
