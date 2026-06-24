import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '../../../lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" {...sceneTransitions.perspectiveFlip}>
      
      {/* Central shield/browser abstraction */}
      <motion.div
        className="relative w-[40vw] h-[30vw] border-2 border-[var(--color-secondary)]/30 bg-[var(--color-bg-dark)] rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,224,164,0.1)]"
        initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, rotateX: 0 } : { opacity: 0, scale: 0.8, rotateX: 20 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
      >
        {/* Fake browser bar */}
        <div className="h-8 border-b border-[var(--color-secondary)]/30 flex items-center px-4 gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--color-text-muted)]/30" />
          <div className="w-3 h-3 rounded-full bg-[var(--color-text-muted)]/30" />
          <div className="w-3 h-3 rounded-full bg-[var(--color-text-muted)]/30" />
          <div className="ml-4 px-4 py-1 rounded bg-[var(--color-bg-light)] text-[0.6vw] font-mono text-[var(--color-text-secondary)] border border-[var(--color-secondary)]/20">
            file://local/audio-analyzer.html
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative p-8 text-center">
          <motion.div
            className="w-20 h-20 mb-6 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/30"
            initial={{ scale: 0 }}
            animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Lock Icon */}
            <svg className="w-10 h-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </motion.div>

          <motion.h2
            className="text-[3vw] font-display font-bold text-white uppercase tracking-wide leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          >
            Zero Uploads.<br/>Works Offline.
          </motion.h2>

          <motion.p
            className="text-[1.2vw] font-mono text-[var(--color-text-secondary)] max-w-[80%]"
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            A single HTML file. Your audio never leaves your device. Uncompromising privacy.
          </motion.p>
        </div>

        {/* Code/Data flowing out effect (cross-out) */}
        {phase >= 4 && (
          <motion.div
            className="absolute right-[-10%] top-1/2 h-[2px] bg-red-500/50 w-[120%] rotate-[-25deg] origin-center shadow-[0_0_10px_red]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "circOut" }}
          />
        )}
      </motion.div>

    </motion.div>
  );
}
