import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardStats from "./components/DashboardStats";
import TaskForm from "./components/TaskForm";
import FilterBar from "./components/FilterBar";
import TaskCard from "./components/TaskCard";
import XPBar from "./components/XPBar";
import CompanionBubble from "./components/CompanionBubble";
import AuraStatus from "./components/AuraStatus";
import FocusMode from "./modules/FocusMode/FocusMode";
import DisciplineMode from "./modules/DisciplineMode/DisciplineMode";
import AuraOverlay from "./overlays/AuraOverlay";
import InitialAwakening from "./components/InitialAwakening";
import PlayerProfile from "./components/PlayerProfile";
import { APIService } from "./services/api_service";
import { SoundEngine } from "./services/soundEngine";
import { EventBus, EventTypes } from "./events/eventBus";
import { useAppState } from "./state/AppStateContext";
import { getSoundCue, getAuraSoundCue } from "./ai/behavioralResponses";
import { Logger } from "./utils/logger";
import { usePWA } from "./hooks/usePWA";
import "./App.css";

// ---------------------------------------------------------------------------
// STARTUP PRELOAD — only small, high-priority files
// WHY these keys: XP/level sounds fire within seconds of first interaction.
// Meme sounds are purposely lazy-loaded — they're less time-critical.
// Focus ambience excluded — large files (1MB–18MB) load on demand only.
// ---------------------------------------------------------------------------
SoundEngine.preload(['xp_gain', 'level_up', 'aura_focus_shift']);

function App() {
  const [tasks,  setTasks]  = useState([]);
  const [filter, setFilter] = useState("All");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Tracks Render free-tier cold-start state — shown instead of a crash
  const [isColdStart, setIsColdStart] = useState(false);

  const { state } = useAppState();
  const { isOffline, isInstallable, isInstalling, installPWA } = usePWA();

  // ── Data Layer ─────────────────────────────────────────────────────────────

  const loadTasks = useCallback(async (signal) => {
    const data = await APIService.getTasks(signal);
    setTasks(data);
  }, []);

  const addTask = useCallback(async (title, deadlineType, deadlineValue) => {
    try {
      const controller = new AbortController();
      const newTask = await APIService.createTask(title, deadlineType, deadlineValue, controller.signal);
      setTasks(prev => [newTask, ...prev]);
      // Meme sound: fires on creation for distraction tasks — before XP is even gained.
      // WHY on create: the behavioral feedback lands when the intention is declared,
      // making the app feel emotionally self-aware and proactive.
      const memeCue = getSoundCue(title, 'create');
      if (memeCue) SoundEngine.play(memeCue);
    } catch (err) {
      Logger.error("addTask — failed", err);
      throw err;
    }
  }, []);

  const toggleTask = useCallback(async (id) => {
    try {
      const controller = new AbortController();
      const updatedTask = await APIService.toggleTask(id, controller.signal);
      setTasks(prev => prev.map(t => t._id === id ? updatedTask : t));
    } catch (err) {
      Logger.error("toggleTask — failed", err);
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    const controller = new AbortController();
    const success = await APIService.deleteTask(id, controller.signal);
    if (success) setTasks(prev => prev.filter(t => t._id !== id));
  }, []);

  // ── Failure Storm (Task Expiration) ────────────────────────────────────────

  const failedTasks = useMemo(() => tasks.filter(t => t.failed && !t.failureNotified), [tasks]);
  const [showFailureStorm, setShowFailureStorm] = useState(false);

  useEffect(() => {
    if (failedTasks.length > 0 && !showFailureStorm) {
      setShowFailureStorm(true);
      SoundEngine.play('meme_fail'); // Play failure sound
    }
  }, [failedTasks, showFailureStorm]);

  const dismissFailure = async () => {
    setShowFailureStorm(false);
    // Acknowledge all failed tasks so they don't trigger again
    const controller = new AbortController();
    for (const task of failedTasks) {
      await APIService.updateTask(task._id, { failureNotified: true }, controller.signal);
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, failureNotified: true } : t));
    }
  };

  // ── Sound + Event Wiring ───────────────────────────────────────────────────

  useEffect(() => {
    SoundEngine.setupUnlockListeners();
    const controller = new AbortController();

    // Await loadTasks so we can clear the cold-start overlay when it resolves
    // (whether tasks loaded successfully or returned the safe empty fallback).
    loadTasks(controller.signal).finally(() => setIsColdStart(false));

    // XP gain → xp_gain chime
    // WHY xp_gain (not 'complete' cue): the completion sound from getSoundCue()
    // also returns 'xp_gain', but we listen directly here so the sound fires even
    // if an external system (future mission engine) dispatches XP_GAINED directly.
    const unsubXP = EventBus.on(EventTypes.XP_GAINED, () => {
      SoundEngine.play('xp_gain');
    });

    // Task completed → behavioral completion sound (xp_gain, consistent with XP)
    // Note: level_up sound fires in useXPSystem — not here — to keep it tied to
    // the actual level state change, not just a dispatch event.
    const unsubComplete = EventBus.on(EventTypes.TASK_COMPLETED, ({ task }) => {
      const cue = getSoundCue(task?.title, 'complete');
      // 'xp_gain' is returned by getSoundCue for complete events.
      // SoundEngine throttle prevents double-play if XP_GAINED also fires.
      if (cue) SoundEngine.play(cue);
    });

    // Aura transition sounds on mode changes
    const unsubFocusEnter = EventBus.on(EventTypes.FOCUS_MODE_ENTERED, () => {
      const cue = getAuraSoundCue('FOCUS_MODE_ENTERED');
      if (cue) SoundEngine.play(cue);
    });

    const unsubFocusExit = EventBus.on(EventTypes.FOCUS_MODE_EXITED, () => {
      const cue = getAuraSoundCue('FOCUS_MODE_EXITED');
      if (cue) SoundEngine.play(cue);
    });

    const unsubDisciplineEnter = EventBus.on(EventTypes.DISCIPLINE_MODE_ENTERED, () => {
      const cue = getAuraSoundCue('DISCIPLINE_MODE_ENTERED');
      if (cue) SoundEngine.play(cue);
    });

    const unsubDisciplineExit = EventBus.on(EventTypes.DISCIPLINE_MODE_EXITED, () => {
      const cue = getAuraSoundCue('DISCIPLINE_MODE_EXITED');
      if (cue) SoundEngine.play(cue);
    });

    // Render cold-start detection: api_service dispatches this on first timeout.
    // Show the waking overlay instead of surfacing a raw network error.
    const unsubWaking = EventBus.on(EventTypes.BACKEND_WAKING, () => {
      setIsColdStart(true);
    });

    return () => {
      controller.abort();
      unsubXP();
      unsubComplete();
      unsubFocusEnter();
      unsubFocusExit();
      unsubDisciplineEnter();
      unsubDisciplineExit();
      unsubWaking();
    };
  }, [loadTasks]);

  // ── Filtered Task List ─────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      switch (filter) {
        case "Active":        return !task.completed;
        case "Completed":     return task.completed;
        case "Elite Priority":return task.priority === "Elite";
        case "High Priority": return task.priority === "High" || task.priority === "Elite";
        case "Work":          return task.category === "Work";
        case "Personal":      return task.category === "Personal";
        default:              return true;
      }
    });
  }, [tasks, filter]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <InitialAwakening />
      <PlayerProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AuraOverlay />
      <CompanionBubble />

      {/* SYSTEM FAILURE POPUP STORM */}
      <AnimatePresence>
        {showFailureStorm && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 0, 0, 0.2)', pointerEvents: 'auto' }} onClick={dismissFailure} />
            {failedTasks.map((task, i) => {
              const top = Math.random() * 60 + 10;
              const left = Math.random() * 60 + 10;
              return (
                <motion.div
                  key={task._id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  style={{
                    position: 'absolute',
                    top: `${top}%`,
                    left: `${left}%`,
                    background: 'rgba(20, 0, 0, 0.9)',
                    border: '2px solid var(--danger)',
                    padding: '1.5rem',
                    boxShadow: '0 0 30px var(--danger)',
                    pointerEvents: 'auto',
                    maxWidth: '300px',
                    transform: `rotate(${(Math.random() - 0.5) * 10}deg)`
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)', fontFamily: "'JetBrains Mono', monospace" }}>[ SYSTEM ERROR ]</h3>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem' }}>MISSION FAILED: {task.title}</p>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>TIME LIMIT EXCEEDED.</p>
                </motion.div>
              );
            })}
            <button 
              onClick={dismissFailure}
              style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', background: 'var(--danger)', color: 'white', border: 'none', padding: '1rem 2rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', cursor: 'pointer', zIndex: 10000 }}
            >
              ACKNOWLEDGE FAILURE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Aura OS</h1>
          <AuraStatus />
          {isInstallable && (
            <button className="install-btn" onClick={installPWA} disabled={isInstalling}>
              {isInstalling ? '[ INSTALLING... ]' : '[ INSTALL ]'}
            </button>
          )}
        </div>
        <div className="header-right">
          <button 
            onClick={() => setIsProfileOpen(true)} 
            className="level-badge" 
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            [{state.player?.name || 'PLAYER'}]
          </button>
          <span className="level-badge">Lvl {state.level}</span>
          <span className="xp-text">{state.xp} XP</span>
        </div>
      </header>

      <XPBar />
      <DashboardStats tasks={tasks} />

      <main className="main-content">
        <div>
          <FilterBar filter={filter} setFilter={setFilter} />

          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>No tasks found</h3>
                <p>Initiate a mission to begin.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TaskCard
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <aside className="side-panel">
          <TaskForm onAdd={addTask} />
          <FocusMode />
          <DisciplineMode />
        </aside>
      </main>

      {/* OFFLINE FALLBACK OVERLAY */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="offline-overlay"
          >
            <div className="offline-content">
              <h2 className="offline-title">[ SYSTEM OFFLINE ]</h2>
              <p className="offline-text">Aura OS is disconnected. Core systems still available.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER COLD-START OVERLAY */}
      {/* Shown when the Render free-tier backend is waking from sleep (10–30 s). */}
      {/* Clears automatically once loadTasks() resolves — no user action needed. */}
      <AnimatePresence>
        {isColdStart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 8888,
              background: 'rgba(5, 8, 20, 0.97)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              pointerEvents: 'none',
            }}
          >
            {/* Scan-line shimmer */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(0deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
                backgroundSize: '100% 5px',
                pointerEvents: 'none',
              }}
              animate={{ backgroundPosition: ['0% 0%', '0% 100%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />

            {/* Pulsing orb */}
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '2px solid rgba(0,229,255,0.5)',
                boxShadow: '0 0 40px rgba(0,229,255,0.3), inset 0 0 20px rgba(0,229,255,0.1)',
                background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
              }}
            />

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <motion.div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '0.3em',
                  color: 'rgba(0,229,255,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                AURA OS — CORE SYSTEMS
              </motion.div>

              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.1rem',
                  color: 'var(--primary, #00e5ff)',
                  letterSpacing: '0.1em',
                }}
              >
                Waking Aura OS core systems...
              </motion.div>

              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.1em',
                marginTop: '0.25rem',
              }}>
                Backend initializing — please stand by.
              </div>
            </div>

            {/* Animated loading bar */}
            <div style={{
              width: '220px',
              height: '2px',
              background: 'rgba(0,229,255,0.1)',
              borderRadius: '1px',
              overflow: 'hidden',
            }}>
              <motion.div
                style={{ height: '100%', background: 'rgba(0,229,255,0.6)', borderRadius: '1px' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;