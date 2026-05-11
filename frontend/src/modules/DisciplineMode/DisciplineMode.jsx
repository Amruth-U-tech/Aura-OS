/**
 * DisciplineMode Module — Solo Leveling System Quest
 * Manages scheduled routines and cinematic system lock-ins.
 *
 * Phase C: Predefined tasks locked in at a scheduled time.
 * When the alarm triggers, the UI is completely blocked until the quest is aborted/finished.
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus, EventTypes } from '../../events/eventBus';
import { SoundEngine } from '../../services/soundEngine';
import { APIService } from '../../services/api_service';
import { Logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// CV backend base URL — resolved from Vite environment at build time.
// .env (local):       VITE_CV_URL=http://localhost:8000
// .env.production:    VITE_CV_URL=https://aura-os-d88w.onrender.com
// Falls back to localhost so local dev works even without an .env file.
// ---------------------------------------------------------------------------
const CV_BASE_URL = import.meta.env.VITE_CV_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Environment gate — CV tracking is LOCAL-ONLY.
// The FastAPI CV service requires a local camera and cannot run on Vercel.
// In production all CV fetches, polling, and camera init are suppressed.
// Quest tasks fall back to manual completion so XP / EventBus still fire.
// ---------------------------------------------------------------------------
const isLocalEnvironment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1');

// Log CV mode once at module load (dev/debug only)
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') {
  Logger.info(
    isLocalEnvironment
      ? '[CV] Local tracking mode enabled'
      : '[CV] Production deployment detected — tracker disabled safely'
  );
}

const DAILY_QUEST = [
  { id: 'pushups', label: "10 Pushups", target: 10 },
  { id: 'situps', label: "10 Situps", target: 10 },
  { id: 'squats', label: "10 Squats", target: 10 }
];

// Memoized to prevent stream duplication and rerenders
const CVCameraStream = memo(({ onAbort }) => {
  return (
    <div style={{ position: 'relative', width: '640px', height: '480px', border: '2px solid var(--primary)', boxShadow: '0 0 40px rgba(0,229,255,0.2)' }}>
      <img 
        src={`${CV_BASE_URL}/video_feed`} 
        alt="CV Tracking Active" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
      <button
        onClick={onAbort}
        style={{
          position: 'absolute',
          top: '-40px',
          right: '0',
          background: 'transparent',
          color: 'var(--danger)',
          border: '1px solid var(--danger)',
          padding: '5px 15px',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      >
        [ ABORT CAMERA ]
      </button>
    </div>
  );
});

export default function DisciplineMode() {
  const [scheduledTime, setScheduledTime] = useState(localStorage.getItem('aura_routine_time') || '');
  const [isScheduled, setIsScheduled] = useState(localStorage.getItem('aura_routine_active') === 'true');
  const [isQuestTriggered, setIsQuestTriggered] = useState(false);
  const [timeRemainingStr, setTimeRemainingStr] = useState('');
  
  // Interactive quest state
  const [completedQuests, setCompletedQuests] = useState({});
  const [activeExercise, setActiveExercise] = useState(null);

  // Clock tick to check if scheduled time has been reached
  useEffect(() => {
    const timer = setInterval(() => {
      if (isScheduled && scheduledTime && !isQuestTriggered) {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;
        
        if (currentTimeStr === scheduledTime) {
          triggerQuest();
        } else {
          // Calculate remaining time for display
          const [sH, sM] = scheduledTime.split(':').map(Number);
          let diffMins = (sH * 60 + sM) - (now.getHours() * 60 + now.getMinutes());
          if (diffMins < 0) diffMins += 24 * 60; // Next day
          
          const remH = Math.floor(diffMins / 60);
          const remM = diffMins % 60;
          setTimeRemainingStr(`- ${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isScheduled, scheduledTime, isQuestTriggered]);

  // CV Polling — LOCAL ONLY
  // In production this effect returns immediately, preventing any fetch
  // spam, memory leaks, or CPU overhead from a never-resolving interval.
  useEffect(() => {
    if (!isLocalEnvironment) return; // ← hard gate: no polling in production
    if (!activeExercise) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${CV_BASE_URL}/status`);
        const data = await res.json();
        if (data.active && data.completed) {
          await fetch(`${CV_BASE_URL}/stop`, { method: 'POST' });
          setCompletedQuests(prev => ({ ...prev, [activeExercise]: true }));
          setActiveExercise(null);
          SoundEngine.play('xp_gain');
        }
      } catch (err) {
        // Backend might be restarting or unreachable — silently retry
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExercise]);

  const toggleSchedule = () => {
    if (isScheduled) {
      setIsScheduled(false);
      localStorage.setItem('aura_routine_active', 'false');
    } else {
      if (!scheduledTime) return;
      setIsScheduled(true);
      localStorage.setItem('aura_routine_time', scheduledTime);
      localStorage.setItem('aura_routine_active', 'true');
      SoundEngine.play('xp_gain');
    }
  };

  const triggerQuest = useCallback(() => {
    setIsQuestTriggered(true);
    setCompletedQuests({});
    EventBus.dispatch(EventTypes.DISCIPLINE_MODE_ENTERED, { type: 'daily_quest' });
    // 'aura_energy' is the correct catalog key for discipline/focus activation.
    // 'discipline_enter' does not exist in SOUND_CATALOG.
    SoundEngine.play('aura_energy');
    Logger.info('DisciplineMode — Daily Quest Triggered!');
  }, []);

  const completeQuest = useCallback(() => {
    setIsQuestTriggered(false);
    setIsScheduled(false);
    localStorage.setItem('aura_routine_active', 'false');
    
    EventBus.dispatch(EventTypes.DISCIPLINE_MODE_EXITED);
    EventBus.dispatch(EventTypes.XP_GAINED, { amount: 150 }); // Huge reward for daily routine
    // 'level_up' is the correct victory sound for mission completion.
    // 'victory' does not exist in SOUND_CATALOG.
    SoundEngine.play('level_up');
    Logger.info('DisciplineMode — mission complete');
  }, []);

  const handleAbortCamera = useCallback(async () => {
    // Only call the CV stop endpoint when running locally — in production
    // there is no CV process to signal and the fetch would 404-spam.
    if (isLocalEnvironment) {
      await fetch(`${CV_BASE_URL}/stop`, { method: 'POST' }).catch(() => {});
    }
    setActiveExercise(null);
  }, []);

  const abortQuest = useCallback(async () => {
    if (activeExercise) {
      await handleAbortCamera();
    }
    setIsQuestTriggered(false);
    setIsScheduled(false);
    localStorage.setItem('aura_routine_active', 'false');
    
    EventBus.dispatch(EventTypes.DISCIPLINE_MODE_EXITED);
    SoundEngine.stopAmbient(600);
    Logger.info('DisciplineMode — mission aborted');
  }, []);

  const startCVExercise = async (id, target) => {
    if (completedQuests[id] || activeExercise) return;

    // -----------------------------------------------------------------------
    // PRODUCTION MODE: manual completion path
    // No CV fetches, no camera overlay, no activeExercise set.
    // XP and EventBus still fire — the quest remains fully completable.
    // -----------------------------------------------------------------------
    if (!isLocalEnvironment) {
      Logger.info(`[CV] Production manual completion: ${id}`);
      setCompletedQuests(prev => ({ ...prev, [id]: true }));
      SoundEngine.play('xp_gain');
      return;
    }

    // -----------------------------------------------------------------------
    // LOCAL MODE: full OpenCV tracking path
    // -----------------------------------------------------------------------
    setActiveExercise(id);
    try {
      await fetch(`${CV_BASE_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: id, targetReps: target })
      });
    } catch (err) {
      Logger.error(`Failed CV execution for ${id}`, err);
      setActiveExercise(null);
    }
  };

  const allQuestsCompleted = DAILY_QUEST.every(q => completedQuests[q.id]);

  return (
    <>
      {/* Sidebar Module (Inactive State) */}
      <div className="discipline-module">
        <h3 className="module-title">DAILY QUEST</h3>
        <p className="module-desc">Schedule your daily awakening routine.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
          <div className="input-group">
            <label className="form-hint">ACTIVATION TIME</label>
            <input
              type="time"
              className="task-input"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              disabled={isScheduled}
              style={{ fontSize: '1rem', padding: '0.5rem' }}
            />
          </div>

          <button
            className={`submit-btn ${isScheduled ? 'active' : ''}`}
            onClick={toggleSchedule}
            disabled={!scheduledTime}
            style={{ 
              borderColor: isScheduled ? 'var(--danger)' : 'var(--primary)',
              color: isScheduled ? 'var(--danger)' : 'var(--primary)'
            }}
          >
            {isScheduled ? `LOCKED ${timeRemainingStr}` : 'ACTIVATE PROTOCOL'}
          </button>
        </div>
      </div>

      {/* Fullscreen Overlay (Active Quest State) */}
      <AnimatePresence>
        {isQuestTriggered && (
          <motion.div
            className="focus-overlay"
            style={{ zIndex: 300, background: 'rgba(5, 0, 0, 0.98)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <div className="focus-vignette" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(200,0,0,0.3) 100%)' }} />
            
            <motion.div
              className="focus-shimmer-bg"
              style={{ background: 'linear-gradient(0deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)', backgroundSize: '100% 4px' }}
              animate={{ backgroundPosition: ['0% 0%', '0% 100%'] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />

            <motion.div
              className="focus-content"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { delay: 0.2, type: 'spring' } }}
              exit={{ scale: 1.05, opacity: 0 }}
            >
              <motion.div
                className="focus-icon"
                style={{ color: 'var(--danger)', textShadow: '0 0 30px var(--danger)', fontSize: '4rem' }}
                animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} // Fast pulse alarm
              >
                ⚠
              </motion.div>
              
              <h2 className="focus-title" style={{ color: 'var(--danger)', textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}>
                DAILY QUEST ARRIVED
              </h2>
              
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                padding: '2rem 3rem',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3), inset 0 0 15px rgba(239, 68, 68, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginTop: '1rem',
                width: '100%',
                maxWidth: '400px'
              }}>
                <div className="discipline-mission-label" style={{ fontSize: '1rem', letterSpacing: '0.2em', textAlign: 'center', marginBottom: '1rem' }}>
                  REQUIRED OBJECTIVES:
                </div>
                
                {DAILY_QUEST.map((task) => {
                  const isCompleted = completedQuests[task.id];
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => startCVExercise(task.id, task.target)}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '1.2rem',
                        color: isCompleted ? 'var(--success)' : 'var(--text-main)',
                        textShadow: isCompleted ? '0 0 10px var(--success)' : '0 0 10px rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${isCompleted ? 'var(--success)' : 'rgba(239, 68, 68, 0.3)'}`,
                        cursor: (isCompleted || activeExercise) ? 'not-allowed' : 'pointer',
                        opacity: (activeExercise && activeExercise !== task.id) ? 0.5 : 1
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--danger)'}`, background: isCompleted ? 'var(--success)' : 'transparent' }}></div>
                      {task.label} {activeExercise === task.id ? '(CAMERA ACTIVE)' : ''}
                    </div>
                  );
                })}
              </div>

              {/* CV Mode Notice */}
              {isLocalEnvironment ? (
                <p style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', marginTop: '1rem' }}>
                  System locked. Click an objective to begin optical tracking.
                </p>
              ) : (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.25rem',
                  border: '1px solid rgba(0, 229, 255, 0.15)',
                  background: 'rgba(0, 229, 255, 0.04)',
                  boxShadow: '0 0 20px rgba(0,229,255,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  textAlign: 'center',
                }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem',
                    letterSpacing: '0.2em',
                    color: 'var(--primary)',
                    opacity: 0.5,
                  }}>
                    [ AURA CV ENGINE — REMOTE MODE ]
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                  }}>
                    Realtime posture tracking requires local desktop mode.<br />
                    <span style={{ color: 'rgba(0,229,255,0.5)' }}>Click any objective to confirm manually.</span>
                  </span>
                </div>
              )}

              {allQuestsCompleted ? (
                <motion.button
                  className="focus-exit-btn"
                  onClick={completeQuest}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderColor: 'var(--success)', color: 'var(--success)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}
                >
                  SYSTEM UNLOCKED - COMPLETE
                </motion.button>
              ) : (
                <motion.button
                  className="focus-exit-btn"
                  onClick={abortQuest}
                  disabled={activeExercise !== null}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '1rem', opacity: activeExercise ? 0.3 : 1 }}
                >
                  ABORT PROTOCOL
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CV Camera Overlay */}
      <AnimatePresence>
        {activeExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CVCameraStream onAbort={handleAbortCamera} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
