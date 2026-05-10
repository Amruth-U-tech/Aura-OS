/**
 * FocusMode Module
 * Self-contained Focus Mode control surface.
 * Encapsulates the toggle button, status, and overlay mounting.
 * Parent (App.jsx) renders this in the side panel.
 */
import { AnimatePresence } from 'framer-motion';
import { useFocusMode } from '../../hooks/useFocusMode';
import FocusOverlay from '../../overlays/FocusOverlay';

export default function FocusMode() {
  const { isFocused, toggleFocus, exitFocus } = useFocusMode();

  return (
    <>
      {/* Focus Mode control button in the side panel */}
      <div className="focus-mode-module">
        <h3 className="module-title">Focus Mode</h3>
        <p className="module-desc">
          {isFocused ? 'You are locked in.' : 'Block out distractions.'}
        </p>
        <button
          className={`focus-toggle-btn ${isFocused ? 'active' : ''}`}
          onClick={toggleFocus}
          aria-label={isFocused ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {isFocused ? '◉ In Focus' : '○ Enter Focus'}
        </button>
      </div>

      {/* Overlay mounts/unmounts with animation via AnimatePresence */}
      <AnimatePresence mode="wait">
        {isFocused && <FocusOverlay key="focus-overlay" onExit={exitFocus} />}
      </AnimatePresence>
    </>
  );
}
