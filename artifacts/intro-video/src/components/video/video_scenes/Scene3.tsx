import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '../../../lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" {...sceneTransitions.wipe}>
      
      {/* Background grid specific to this scene */}
      <motion.div 
        className="absolute inset-0 border-[0.5px] border-[var(--color-secondary)]/20 rounded-full w-[80vh] h-[80vh] m-auto"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 1, ease: "circOut" }}
      >
        {/* Concentric circles */}
        <div className="absolute inset-[20%] border-[0.5px] border-[var(--color-secondary)]/20 rounded-full" />
        <div className="absolute inset-[40%] border-[0.5px] border-[var(--color-secondary)]/20 rounded-full" />
        
        {/* Crosshairs */}
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[var(--color-secondary)]/30" />
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[var(--color-secondary)]/30" />
      </motion.div>

      {/* Animated Lissajous-like curve */}
      {phase >= 2 && (
        <svg className="absolute w-[60vh] h-[60vh] z-0 opacity-80" viewBox="-100 -100 200 200">
          <motion.path
            d="M 0,-80 C 50,-80 80,-50 80,0 C 80,50 50,80 0,80 C -50,80 -80,50 -80,0 C -80,-50 -50,-80 0,-80 Z"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ 
              pathLength: 1,
              d: [
                "M 0,-80 C 50,-80 80,-50 80,0 C 80,50 50,80 0,80 C -50,80 -80,50 -80,0 C -80,-50 -50,-80 0,-80 Z",
                "M 0,-60 C 80,-90 90,-20 60,30 C 30,80 -30,80 -60,30 C -90,-20 -80,-90 0,-60 Z",
                "M 0,-80 C 50,-80 80,-50 80,0 C 80,50 50,80 0,80 C -50,80 -80,50 -80,0 C -80,-50 -50,-80 0,-80 Z"
              ]
            }}
            transition={{ 
              pathLength: { duration: 1.5, ease: "easeInOut" },
              d: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
            }}
            style={{ filter: "drop-shadow(0 0 8px var(--color-primary))" }}
          />
        </svg>
      )}

      {/* UI Overlay Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <motion.div
          className="bg-[var(--color-bg-dark)]/80 backdrop-blur-md px-10 py-8 border border-[var(--color-secondary)]/50 rounded-xl text-center shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        >
          <h2 className="text-[3.5vw] font-display font-bold text-white uppercase tracking-wider mb-2">
            Precision Tools
          </h2>
          <div className="flex gap-4 justify-center text-[1vw] font-mono text-[var(--color-primary)]">
            <span>[ LISSAJOUS ]</span>
            <span>[ EBU R 128 ]</span>
            <span>[ BEAT GRID ]</span>
          </div>
        </motion.div>
      </div>

      {/* Floating Data points */}
      {phase >= 4 && [
        { top: '20%', left: '20%', label: 'LUFS', val: '-14.2' },
        { top: '70%', left: '25%', label: 'BPM', val: '124.0' },
        { top: '30%', right: '20%', label: 'LRA', val: '5.8' },
        { top: '65%', right: '22%', label: 'PEAK', val: '-1.0' },
      ].map((data, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-[0.9vw] text-[var(--color-text-secondary)] border border-[var(--color-secondary)]/30 px-3 py-2 bg-[var(--color-bg-dark)]/50"
          style={{ top: data.top, left: data.left, right: data.right }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.15, type: "spring" }}
        >
          <div className="text-[var(--color-text-muted)] text-[0.7vw] mb-1">{data.label}</div>
          <div className="text-[var(--color-primary)]">{data.val}</div>
        </motion.div>
      ))}

    </motion.div>
  );
}
