import { MASCOTTE } from '../content/brand';
import { MascotCat } from './MascotCat';

export type Mood = 'idle' | 'happy' | 'wow' | 'think';

const INK = '#1d1240';
const LILAC = '#d8bfe8';
const LILAC_DARK = '#b88fd6';
const stroke = { stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** A limb drawn as a thick outlined line. */
function Limb({ d, width = 24 }: { d: string; width?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={width + 8} />
      <path d={d} stroke={LILAC} strokeWidth={width} />
    </g>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'happy') {
    return (
      <g {...stroke} strokeWidth={5.5} fill="none">
        <path d="M78 60 Q86 50 94 60" />
        <path d="M106 60 Q114 50 122 60" />
      </g>
    );
  }
  const r = mood === 'wow' ? 8.5 : 6.5;
  const dy = mood === 'think' ? -2.5 : 0;
  const dx = mood === 'think' ? 2.5 : 0;
  return (
    <g className="mascot-eyes">
      {[86, 114].map((cx) => (
        <g key={cx}>
          <circle cx={cx + dx} cy={58 + dy} r={r} fill={INK} />
          <circle cx={cx + dx + 2.4} cy={58 + dy - 2.4} r={2.2} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'happy') return <path d="M88 71 Q100 86 112 71 Z" fill="#7d0f1f" {...stroke} strokeWidth={4} />;
  if (mood === 'wow') return <ellipse cx={100} cy={75} rx={5.5} ry={7} fill="#7d0f1f" {...stroke} strokeWidth={3.5} />;
  if (mood === 'think') return <path d="M93 74 Q100 71 108 75" fill="none" {...stroke} strokeWidth={4} />;
  return <path d="M91 72 Q100 80 109 72" fill="none" {...stroke} strokeWidth={4} />;
}

/** The turtle: a cartoon turtle, standing arms up. Original drawing, purely decorative. */
function MascotTurtle({ mood = 'idle', size = 160, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const armsUp = mood === 'happy' || mood === 'wow';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`mascot mood-${mood} ${className}`} width={size} height={size * 1.05}
      viewBox="0 0 200 210" aria-hidden="true">
      {/* tail */}
      <path d="M142 168 Q166 170 170 184 Q154 184 140 178 Z" fill={LILAC} {...stroke} strokeWidth={5} />
      {/* legs */}
      <Limb d="M80 172 L74 196" width={26} />
      <Limb d={mood === 'happy' ? 'M122 172 L148 186' : 'M122 172 L126 196'} width={26} />
      {/* shell rim, then body */}
      <ellipse cx={100} cy={128} rx={60} ry={62} fill={LILAC_DARK} {...stroke} strokeWidth={6} />
      <ellipse cx={100} cy={130} rx={50} ry={55} fill={LILAC} {...stroke} strokeWidth={5} />
      {/* belly with its grid */}
      <ellipse cx={100} cy={132} rx={37} ry={42} fill="#fff" {...stroke} strokeWidth={4.5} />
      <g {...stroke} strokeWidth={3} fill="none" opacity={0.85}>
        <path d="M100 91 V173" />
        <path d="M65 118 Q100 128 135 118" />
        <path d="M64 146 Q100 156 136 146" />
      </g>
      {/* arms */}
      <Limb d={armsUp ? 'M58 112 Q38 104 26 72' : 'M58 116 Q36 124 28 146'} />
      <Limb d={armsUp ? 'M142 112 Q162 104 174 72' : 'M142 116 Q164 124 172 146'} />
      {/* head */}
      <ellipse cx={100} cy={62} rx={35} ry={31} fill={LILAC} {...stroke} strokeWidth={5.5} />
      <ellipse cx={72} cy={70} rx={8} ry={5} fill="#d1271c" opacity={0.28} />
      <ellipse cx={128} cy={70} rx={8} ry={5} fill="#d1271c" opacity={0.28} />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </svg>
  );
}

/** The active mascot (see content/brand.ts). */
export function Mascot(props: { mood?: Mood; size?: number; className?: string }) {
  return MASCOTTE === 'chat' ? <MascotCat {...props} /> : <MascotTurtle {...props} />;
}

export function Bubble({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bubble ${className}`}>{children}</div>;
}
