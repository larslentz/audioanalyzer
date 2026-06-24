import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 4000,
  visuals: 4500,
  tools: 4500,
  privacy: 4000,
  outro: 5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  visuals: Scene2,
  tools: Scene3,
  privacy: Scene4,
  outro: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

const gridVariants = {
  animate: {
    backgroundPosition: ['0px 0px', '40px 40px'],
    transition: {
      repeat: Infinity,
      duration: 3,
      ease: 'linear',
    },
  },
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey]);

  const positions = {
    x: ['80vw', '10vw', '70vw', '20vw', '50vw'],
    y: ['-10vh', '70vh', '20vh', '10vh', '40vh'],
    rotate: [0, 90, 180, 270, 360],
    scale: [0.5, 1.2, 0.8, 1.5, 1],
    opacity: [0.1, 0.3, 0.2, 0.1, 0.4],
    lineTop: ['20%', '80%', '40%', '60%', '50%'],
    lineLeft: ['10%', '60%', '10%', '50%', '30%'],
    lineScaleX: [1, 1.5, 0.8, 2, 1],
  };

  const si = Math.max(0, Math.min(sceneIndex, 4));

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: 'var(--color-bg-light)' }}>
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          className="absolute inset-[-100%] opacity-20"
          style={{
            backgroundImage: `linear-gradient(var(--color-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--color-secondary) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
          variants={gridVariants}
          animate="animate"
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-10"
          style={{ backgroundColor: 'var(--color-primary)' }}
          animate={{ x: ['-20%', '20%', '-10%'], y: ['-10%', '30%', '10%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-10 right-0 bottom-0"
          style={{ backgroundColor: 'var(--color-secondary)' }}
          animate={{ x: ['10%', '-30%', '0%'], y: ['20%', '-20%', '10%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] opacity-30 shadow-[0_0_15px_var(--color-primary)]"
          style={{ backgroundColor: 'var(--color-primary)' }}
          animate={{ left: ['-5%', '105%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        className="absolute z-10 w-[30vw] h-[30vh] border border-[var(--color-primary)]/20 rounded-full"
        animate={{
          x: positions.x[si],
          y: positions.y[si],
          rotate: positions.rotate[si],
          scale: positions.scale[si],
          opacity: positions.opacity[si],
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute z-10 w-[20vw] h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent"
        animate={{
          top: positions.lineTop[si],
          left: positions.lineLeft[si],
          opacity: si === 4 ? 0 : 0.5,
          scaleX: positions.lineScaleX[si],
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      <div className="relative z-20 w-full h-full">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
