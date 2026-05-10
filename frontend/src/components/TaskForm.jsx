/**
 * TaskForm — Premium Input Component (Phase B.2)
 *
 * Visual polish:
 * - Atmospheric focus ring on input (glow, not just border)
 * - Submit button hover sweep effect
 * - Button press spring feedback
 * - Form entrance animation on mount
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonTapVariants } from '../animations/auraTransitions';

export default function TaskForm({ onAdd }) {
  const [title,   setTitle]   = useState('');
  const [focused, setFocused] = useState(false);
  const [deadlineType, setDeadlineType] = useState('None');
  const [deadlineValue, setDeadlineValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title, deadlineType, deadlineValue);
    setTitle('');
    setDeadlineType('None');
    setDeadlineValue('');
  };

  return (
    <motion.form
      className="task-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="form-title">New Mission</h2>
      <p className="form-hint">What are you committing to?</p>

      <div className="input-group">
        <div className={`input-wrapper ${focused ? 'focused' : ''}`}>
          <input
            type="text"
            className="task-input"
            placeholder="e.g. Study DSA"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Task title"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <select 
            className="task-input" 
            style={{ flex: 1, cursor: 'pointer' }}
            value={deadlineType}
            onChange={(e) => setDeadlineType(e.target.value)}
          >
            <option value="None">No Deadline</option>
            <option value="Hours">Hours to complete</option>
            <option value="ExactTime">Exact Time</option>
          </select>

          {deadlineType === 'Hours' && (
            <input
              type="number"
              className="task-input"
              style={{ flex: 1 }}
              placeholder="e.g. 2"
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              min="1"
            />
          )}

          {deadlineType === 'ExactTime' && (
            <input
              type="time"
              className="task-input"
              style={{ flex: 1 }}
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
            />
          )}
        </div>

        <motion.button
          type="submit"
          className="submit-btn"
          variants={buttonTapVariants}
          whileTap="tap"
          whileHover={{ scale: 1.02 }}
          disabled={!title.trim()}
        >
          <span className="submit-btn-inner">
            <span className="submit-icon">+</span> Add Task
          </span>
        </motion.button>
      </div>
    </motion.form>
  );
}
