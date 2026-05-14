export const detectCategory = (text) => {
  const lower = text.toLowerCase();
  
  if (lower.match(/\b(meeting|project|work|presentation|client)\b/i)) {
    return "Work";
  }
  if (lower.match(/\b(gym|health|workout|doctor|diet|run)\b/i)) {
    return "Health";
  }
  if (lower.match(/\b(exam|assignment|study|homework|course)\b/i)) {
    return "Study";
  }
  if (lower.match(/\b(shopping|groceries|buy|personal|call)\b/i)) {
    return "Personal";
  }
  
  return "General";
};

export const detectPriority = (text) => {
  const lower = text.toLowerCase();

  // AI-powered task validation architecture hooks can be integrated here in the future
  if (lower.match(/\b(transformational|mission critical|life changing|master|dominate)\b/i)) {
    return "Elite";
  }
  if (lower.match(/\b(exam|assignment|deadline|urgent|asap|important)\b/i)) {
    return "High";
  }
  if (lower.match(/\b(project|meeting|review|soon)\b/i)) {
    return "Normal";
  }

  return "Low";
};
