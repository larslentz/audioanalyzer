import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '../../../lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Generate random spectrum bars
  const bars = Array.from({ length: 32 }, (_, i) => i);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-16" {...sceneTransitions.splitHorizontal}>
      
      {/* Left: Content */}
      <div className="w-[40%] z-10">
        <motion.h2
          className="text-[4.5vw] font-display font-bold leading-[1.1] mb-6 text-[var(--color-text-primary)] uppercase"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "circOut" }}
        >
          See Every <br/><span className="text-[var(--color-primary)]">Frequency</span>
        </motion.h2>
        
        <div className="space-y-4">
          {[
            "Real-time spectrum analysis",
            "Scrolling spectrogram",
            "Energy history graphs"
          ].map((text, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 text-[1.2vw] font-mono text-[var(--color-text-secondary)]"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="w-2 h-2 bg-[var(--color-primary)]" />
              {text}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: Abstract Analyzer Visual */}
      <div className="w-[50%] h-[60%] relative flex items-end justify-center gap-1 z-0">
        <motion.div
          className="absolute inset-0 border border-[var(--color-secondary)]/30 rounded-lg bg-[var(--color-bg-dark)]/50 backdrop-blur-sm -z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
        />
        
        {/* Spectrum Bars */}
        <div className="w-full h-full flex items-end justify-between px-4 pb-4">
          {bars.map((bar, i) => {
            const delay = phase >= 3 ? Math.random() * 0.5 : 0;
            return (
              <motion.div
                key={i}
                className="w-[2%] bg-[var(--color-primary)] rounded-t-sm"
                initial={{ height: "5%", opacity: 0 }}
                animate={phase >= 3 ? {
                  height: [`${10 + Math.random() * 20}%`, `${40 + Math.random() * 50}%`, `${20 + Math.random() * 30}%`],
                  opacity: 0.8
                } : { height: "5%", opacity: 0 }}
                transition={{
                  height: { duration: 1.5, repeat: Infinity, repeatType: "mirror", delay },
                  opacity: { duration: 0.3, delay: i * 0.02 }
                }}
                style={{
                  filter: `drop-shadow(0 0 8px var(--color-primary))`
                }}
              />
            );
          })}
        </div>
        
        {/* Spectrogram overlay sweeping line */}
        {phase >= 3 && (
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]"
            initial={{ left: "0%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

    </motion.div>
  );
}
