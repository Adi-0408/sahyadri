import React from 'react';

interface WaveDividerProps {
  to?: 'white' | 'slate-50' | 'slate-900' | 'slate-950';
  variant?: 'forward' | 'reverse';
  className?: string;
}

export const WaveDivider: React.FC<WaveDividerProps> = ({
  to = 'white',
  variant = 'forward',
  className = ''
}) => {
  const colorMap = {
    'white': {
      back: 'fill-white/30',
      mid: 'fill-white/60',
      front: 'fill-white'
    },
    'slate-50': {
      back: 'fill-slate-50/35',
      mid: 'fill-slate-50/65',
      front: 'fill-slate-50'
    },
    'slate-900': {
      back: 'fill-slate-900/35',
      mid: 'fill-slate-900/70',
      front: 'fill-slate-900'
    },
    'slate-950': {
      back: 'fill-slate-950/35',
      mid: 'fill-slate-950/70',
      front: 'fill-slate-950'
    }
  };

  const colors = colorMap[to] || colorMap['white'];

  return (
    <div
      className={`relative w-full overflow-hidden leading-none pointer-events-none z-10 -mb-1 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="relative block w-full h-[32px] sm:h-[48px] md:h-[64px] lg:h-[85px]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        {variant === 'forward' ? (
          <>
            {/* Deep back wave */}
            <path
              d="M0,28 C180,82 360,10 540,50 C720,90 900,22 1080,64 C1260,106 1380,38 1440,52 L1440,120 L0,120 Z"
              className={colors.back}
            />
            {/* Middle rolling wave */}
            <path
              d="M0,52 C220,108 440,30 660,74 C880,118 1100,46 1280,80 C1360,94 1410,66 1440,60 L1440,120 L0,120 Z"
              className={colors.mid}
            />
            {/* Front sea wave */}
            <path
              d="M0,74 C140,116 290,56 450,92 C620,126 790,64 950,98 C1120,132 1290,76 1440,90 L1440,120 L0,120 Z"
              className={colors.front}
            />
          </>
        ) : (
          <>
            {/* Reverse back wave */}
            <path
              d="M0,52 C60,38 180,106 360,64 C540,22 720,90 900,50 C1080,10 1260,82 1440,28 L1440,120 L0,120 Z"
              className={colors.back}
            />
            {/* Reverse middle wave */}
            <path
              d="M0,60 C30,66 80,94 160,80 C340,46 560,118 780,74 C1000,30 1220,108 1440,52 L1440,120 L0,120 Z"
              className={colors.mid}
            />
            {/* Reverse front wave */}
            <path
              d="M0,90 C150,76 320,132 490,98 C650,64 820,126 990,92 C1150,56 1300,116 1440,74 L1440,120 L0,120 Z"
              className={colors.front}
            />
          </>
        )}
      </svg>
    </div>
  );
};
