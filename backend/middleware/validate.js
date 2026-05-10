import { sendError } from '../utils/apiResponse.js';

export const validateTaskPayload = (req, res, next) => {
  const { title } = req.body;
  
  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return sendError(res, 'Task title is required and must be a non-empty string', 'VALIDATION_ERROR', 400);
    }
  }

  // Prevent oversized payloads
  if (JSON.stringify(req.body).length > 5000) {
      return sendError(res, 'Payload too large', 'PAYLOAD_TOO_LARGE', 413);
  }

  next();
};
