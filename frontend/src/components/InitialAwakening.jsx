/**
 * InitialAwakening — First-time System Boot
 * Asks for the player's name and initializes their profile.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerState } from '../state/AppStateContext';
import { SoundEngine } from '../services/soundEngine';

export default function InitialAwakening() {
  const { state, dispatch } = usePlayerState();
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);

  if (!state.isNew) return null;

  const handleNext = () => {
    if (step === 0 && name.trim()) {
      SoundEngine.play('xp_gain'); // Simple beep for now
      setStep(1);
    } else if (step === 1) {
      // Complete awakening
      localStorage.setItem('aura_player_name', name.trim());
      dispatch({ type: 'SET_PLAYER', payload: { name: name.trim(), isNew: false } });
      SoundEngine.play('level_up'); // Cinematic level up sound
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="focus-overlay"
        style={{ zIndex: 1000, background: 'rgba(3, 7, 18, 0.98)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1 } }}
        exit={{ opacity: 0, transition: { duration: 0.8 } }}
      >
        <div className="focus-vignette" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.9) 100%)' }} />
        
        <motion.div
          className="focus-shimmer-bg"
          style={{ background: 'linear-gradient(0deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)', backgroundSize: '100% 4px' }}
          animate={{ backgroundPosition: ['0% 0%', '0% 100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />

        <div className="focus-content" style={{ width: '100%', maxWidth: '500px' }}>
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="focus-icon" style={{ fontSize: '3rem', color: 'var(--primary)', textShadow: '0 0 20px var(--primary)', marginBottom: '1rem' }}>
                ✧
              </div>
              <h2 className="focus-title" style={{ fontSize: '1.5rem', color: 'var(--text-main)', textShadow: 'none', marginBottom: '2rem' }}>
                SYSTEM AWAKENING
              </h2>
              
              <div className="input-group" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <label className="form-hint" style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>ENTER PLAYER ALIAS</label>
                <input
                  type="text"
                  className="task-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="e.g. Sung Jin-Woo"
                  autoFocus
                  style={{ fontSize: '1.2rem', padding: '1rem', textAlign: 'center' }}
                />
              </div>

              <motion.button
                className="submit-btn"
                onClick={handleNext}
                disabled={!name.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ width: '100%' }}
              >
                INITIALIZE
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
            >
              <h2 className="focus-title" style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '1rem' }}>
                WELCOME, PLAYER {name.toUpperCase()}
              </h2>
              <p className="focus-subtitle" style={{ color: 'var(--text-muted)' }}>
                Your journey begins now.
              </p>
              
              <motion.button
                className="submit-btn"
                onClick={handleNext}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ marginTop: '2rem' }}
              >
                ENTER SYSTEM
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
