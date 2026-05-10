/**
 * PlayerProfile — Edit player info (Name, Bio, Goal)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../state/AppStateContext';

export default function PlayerProfile({ isOpen, onClose }) {
  const { state, dispatch } = usePlayerState();
  const [name, setName] = useState(state.name);
  const [bio, setBio]   = useState(state.bio);
  const [goal, setGoal] = useState(state.goal);

  const handleSave = () => {
    localStorage.setItem('aura_player_name', name.trim());
    localStorage.setItem('aura_player_bio', bio.trim());
    localStorage.setItem('aura_player_goal', goal.trim());
    dispatch({ type: 'SET_PLAYER', payload: { name: name.trim(), bio: bio.trim(), goal: goal.trim() } });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="focus-overlay"
        style={{ zIndex: 500, background: 'rgba(5, 9, 20, 0.85)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="task-form"
          style={{ width: '100%', maxWidth: '400px', boxShadow: '0 0 30px rgba(0, 229, 255, 0.1)' }}
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
        >
          <h3 className="form-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>PLAYER PROFILE</h3>
          
          <div className="input-group">
            <label className="form-hint">ALIAS</label>
            <input
              type="text"
              className="task-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="form-hint">BIO (CLASS/ROLE)</label>
            <input
              type="text"
              className="task-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Shadow Monarch"
            />
          </div>

          <div className="input-group">
            <label className="form-hint">MAIN GOAL</label>
            <input
              type="text"
              className="task-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Survive and get stronger"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="submit-btn" style={{ flex: 1, background: 'transparent', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={onClose}>
              CANCEL
            </button>
            <button className="submit-btn" style={{ flex: 1 }} onClick={handleSave}>
              SAVE
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
