/**
 * DashboardStats — Animated Stat Cards (Phase B.2)
 * Stagger entrance on mount. Stats react to value changes with a brief pop.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { statCardVariants } from '../animations/auraTransitions';

const STATS = (total, completed, highPriority) => [
  {
    key:   'total',
    label: 'Total Tasks',
    value: total,
    color: 'var(--text-main)',
    icon:  '◎',
  },
  {
    key:   'completed',
    label: 'Completed',
    value: completed,
    color: 'var(--success)',
    icon:  '✓',
  },
  {
    key:   'priority',
    label: 'High Priority',
    value: highPriority,
    color: 'var(--danger)',
    icon:  '↑',
  },
];

export default function DashboardStats({ tasks }) {
  const total       = tasks.length;
  const completed   = tasks.filter(t => t.completed).length;
  const highPriority = tasks.filter(t => t.priority === 'High' && !t.completed).length;

  const stats = STATS(total, completed, highPriority);

  return (
    <div className="stats-container">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.key}
          className="stat-card"
          variants={statCardVariants}
          custom={i}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2, transition: { duration: 0.18 } }}
        >
          <div className="stat-header">
            <span className="stat-icon" style={{ color: stat.color }}>{stat.icon}</span>
            <span className="stat-title">{stat.label}</span>
          </div>
          {/* Animate value change with a pop */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={stat.value}
              className="stat-value"
              style={{ color: stat.color }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            >
              {stat.value}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
