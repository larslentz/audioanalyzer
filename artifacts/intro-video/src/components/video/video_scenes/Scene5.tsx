import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '../../../lib/video/animations';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)]" {...sceneTransitions.clipCircle}>
      
      {/* Abstract Audio Rings */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        {[1, 2, 3].map((ring, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-[var(--color-primary)]"
            style={{ width: `${(i + 1) * 25}vw`, height: `${(i + 1) * 25}vw` }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, delay: i * 0.2, ease: "easeOut" }}
          />
        ))}
      </div>

      <motion.div 
        className="text-center z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-[5vw] font-display font-bold text-white uppercase tracking-tighter mb-2">
          Audio Analyzer
        </h2>
        <div className="text-[1.5vw] font-mono text-[var(--color-primary)] tracking-widest uppercase">
          By Lars Lentz
        </div>
      </motion.div>

      <motion.div
        className="mt-12 flex flex-col items-center gap-4 z-10"
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={phase >= 2 ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
        transition={{ duration: 0.8 }}
      >
        {[
          "larslentzaudio.wordpress.com",
          "youtube.com/@LarsLentz",
          "larslentz.bandcamp.com",
          "subvert.fm/larslentz"
        ].map((link, i) => (
          <motion.div
            key={i}
            className="text-[1.2vw] font-mono text-[var(--color-text-secondary)] border-b border-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
          >
            {link}
          </motion.div>
        ))}
      </motion.div>
      
      {/* End Scene transition out hint for looping */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-[var(--color-primary)]"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 5, ease: "linear" }}
      />
    </motion.div>
  );
}
