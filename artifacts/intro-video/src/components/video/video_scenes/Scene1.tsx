import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '../../../lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...sceneTransitions.zoomThrough}>
      
      {/* Background Sine Wave */}
      <motion.svg className="absolute w-full h-[40vh] top-1/2 -translate-y-1/2 opacity-30" viewBox="0 0 1000 200" preserveAspectRatio="none">
        <motion.path
          d="M 0 100 Q 125 0 250 100 T 500 100 T 750 100 T 1000 100"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          initial={{ pathLength: 0, strokeDasharray: "1 1" }}
          animate={{ pathLength: phase >= 1 ? 1 : 0, strokeDasharray: "10 10" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.path
          d="M 0 100 Q 125 200 250 100 T 500 100 T 750 100 T 1000 100"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 2.5, ease: "easeInOut", delay: 0.2 }}
        />
      </motion.svg>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          className="px-4 py-1 mb-6 border border-[var(--color-primary)] text-[var(--color-primary)] font-mono text-sm tracking-widest rounded-sm bg-[var(--color-primary)]/10 uppercase"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "circOut" }}
        >
          Lars Lentz Presents
        </motion.div>
        
        <h1 className="text-[7vw] font-display font-bold text-[var(--color-text-primary)] leading-none tracking-tighter uppercase mb-4">
          <span className="block overflow-hidden">
            <motion.span
              className="block"
              initial={{ y: "100%", rotateZ: 5 }}
              animate={phase >= 2 ? { y: "0%", rotateZ: 0 } : { y: "100%", rotateZ: 5 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Audio
            </motion.span>
          </span>
          <span className="block overflow-hidden text-[var(--color-primary)]">
            <motion.span
              className="block"
              initial={{ y: "100%", rotateZ: -5 }}
              animate={phase >= 3 ? { y: "0%", rotateZ: 0 } : { y: "100%", rotateZ: -5 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Analyzer
            </motion.span>
          </span>
        </h1>

        <motion.p
          className="text-[1.5vw] text-[var(--color-text-secondary)] font-mono max-w-2xl"
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={phase >= 4 ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6 }}
        >
          Professional browser-based audio study tool.
        </motion.p>
      </div>

      {/* Frame Corners */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute w-8 h-8 border-[var(--color-primary)] opacity-50 ${pos}`}
          style={{
            borderTopWidth: pos.includes('top') ? '2px' : '0',
            borderBottomWidth: pos.includes('bottom') ? '2px' : '0',
            borderLeftWidth: pos.includes('left') ? '2px' : '0',
            borderRightWidth: pos.includes('right') ? '2px' : '0',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 1 ? { opacity: 0.5, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ delay: 0.5 + (i * 0.1) }}
        />
      ))}
    </motion.div>
  );
}
