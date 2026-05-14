import { sendError } from '../utils/apiResponse.js';

export const validateTaskPayload = (req, res, next) => {
  const { title, deadlineType, deadlineValue } = req.body;
  
  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return sendError(res, 'TASK REJECTED — insufficient objective clarity', 'VALIDATION_ERROR', 400);
    }

    const text = title.trim().toLowerCase();
    
    // Intelligent Heuristic Filter
    const isMeaningless = () => {
      if (text.length < 5) return true; // too short (hi, lol)
      if (/^(.)\1{4,}$/.test(text)) return true; // repeated chars
      if (!text.includes(' ') && text.length < 8) return true; // single word, short
      
      const fillerWords = ['hi', 'hello', 'test', 'testing', 'asdf', 'abc', 'random', 'work', 'lol', 'random123'];
      if (fillerWords.includes(text)) return true;
      
      // excessive symbols
      if ((text.match(/[^a-zA-Z0-9\s]/g) || []).length > text.length / 3) return true;
      
      return false;
    };

    if (isMeaningless()) {
      return sendError(res, 'TASK REJECTED — meaningless or low-intent tasks are not permitted', 'VALIDATION_ERROR', 400);
    }

    if (!deadlineType || deadlineType === 'None' || !['Hours', 'ExactTime'].includes(deadlineType)) {
       return sendError(res, 'DEADLINE REQUIRED FOR SYSTEM TRACKING', 'VALIDATION_ERROR', 400);
    }

    if (!deadlineValue || String(deadlineValue).trim() === '') {
       return sendError(res, 'MISSION PARAMETERS INCOMPLETE — deadline value missing', 'VALIDATION_ERROR', 400);
    }
  }

  // Prevent oversized payloads
  if (JSON.stringify(req.body).length > 5000) {
      return sendError(res, 'Payload too large', 'PAYLOAD_TOO_LARGE', 413);
  }

  next();
};
