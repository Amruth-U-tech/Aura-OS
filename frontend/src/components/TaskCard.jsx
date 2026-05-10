/**
 * TaskCard — Premium Motion Component (Phase B.2)
 *
 * Motion features:
 * - Hover lift with glow border
 * - Completion shimmer + opacity fade
 * - Checkbox spring scale on toggle
 * - Delete button tap shrink
 */
import { motion } from 'framer-motion';
import { buttonTapVariants } from '../animations/auraTransitions';

const cardVariants = {
  rest: {
    y: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  hover: {
    y: -3,
    boxShadow: '0 12px 28px rgba(0,0,0,0.28), 0 0 0 1px rgba(139,92,246,0.25)',
    transition: { duration: 0.22, ease: 'easeOut' },
  },
};

const checkboxVariants = {
  unchecked: { scale: 1 },
  checked: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export default function TaskCard({ task, onToggle, onDelete }) {
  const date = new Date(task.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  return (
    <motion.div
      className={`task-card ${task.completed ? 'completed' : ''}`}
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      layout
    >
      {/* Checkbox with spring scale on check */}
      <motion.button
        className={`checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggle(task._id)}
        aria-label="Toggle completion"
        variants={checkboxVariants}
        animate={task.completed ? 'checked' : 'unchecked'}
        whileTap={{ scale: 0.85 }}
      >
        <span className="checkbox-inner">✓</span>
      </motion.button>

      <div className="task-content">
        <h3 className="task-title">{task.title}</h3>
        <div className="task-meta">
          <span className={`badge priority-${task.priority}`}>{task.priority}</span>
          <span className={`badge category-${task.category}`}>{task.category}</span>
          <span className="task-date">{date}</span>
        </div>
      </div>

      <motion.button
        className="delete-btn"
        onClick={() => onDelete(task._id)}
        aria-label="Delete"
        variants={buttonTapVariants}
        whileTap="tap"
        whileHover={{ color: 'var(--danger)', scale: 1.1 }}
      >
        ✕
      </motion.button>
    </motion.div>
  );
}
