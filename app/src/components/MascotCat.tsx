import type { Mood } from './Mascot';

const INK = '#1d1240';
const stroke = { stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'happy') {
    return (
      <g {...stroke} strokeWidth={6} fill="none">
        <path d="M61 108 Q74 92 87 108" />
        <path d="M113 108 Q126 92 139 108" />
      </g>
    );
  }
  const ry = mood === 'wow' ? 20 : 17;
  const pupil = mood === 'wow' ? { r: 5, dx: 0, dy: 0 } : mood === 'think' ? { r: 7, dx: 4, dy: -6 } : { r: 7.5, dx: 2, dy: 3 };
  return (
    <g className="mascot-eyes">
      {[74, 126].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={106} rx={14} ry={ry} fill="#fff" {...stroke} strokeWidth={4.5} />
          <circle cx={cx + pupil.dx} cy={106 + pupil.dy} r={pupil.r} fill={INK} />
          <circle cx={cx + pupil.dx + 3} cy={106 + pupil.dy - 3.5} r={2.4} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'happy') {
    return (
      <g>
        <path d="M84 139 Q100 166 116 139 Z" fill="#7d0f1f" {...stroke} strokeWidth={4.5} />
        <path d="M92 152 Q100 146 108 152 Q104 158 100 158 Q96 158 92 152 Z" fill="#ff8a80" />
      </g>
    );
  }
  if (mood === 'wow') return <ellipse cx={100} cy={147} rx={7} ry={9} fill="#7d0f1f" {...stroke} strokeWidth={4} />;
  if (mood === 'think') return <path d="M93 143 Q101 139 109 144" fill="none" {...stroke} strokeWidth={4.5} />;
  return <path d="M100 132 V138 M88 138 Q94 146 100 138 Q106 146 112 138" fill="none" {...stroke} strokeWidth={4.5} />;
}

/** Chati, the cartoon cat (previous mascot, kept to be restored: see content/brand.ts). */
export function MascotCat({ mood = 'idle', size = 160, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`mascot mood-${mood} ${className}`} width={size} height={size * 1.05} viewBox="0 0 200 210" aria-hidden="true">
      {/* scarf */}
      <path d="M126 178 L152 204 L128 207 L114 186 Z" fill="#d1271c" {...stroke} strokeWidth={5} />
      <path d="M50 164 Q100 194 150 164 L153 182 Q100 214 47 182 Z" fill="#d1271c" {...stroke} strokeWidth={5} />
      {/* ears */}
      <path d="M38 102 L44 30 Q48 20 57 27 L100 62 Z" fill="#4c0297" {...stroke} strokeWidth={6} />
      <path d="M162 102 L156 30 Q152 20 143 27 L100 62 Z" fill="#4c0297" {...stroke} strokeWidth={6} />
      <path d="M52 80 L55 45 L78 64 Z" fill="#c9a6ee" />
      <path d="M148 80 L145 45 L122 64 Z" fill="#c9a6ee" />
      {/* head */}
      <ellipse cx={100} cy={113} rx={72} ry={60} fill="#4c0297" {...stroke} strokeWidth={6} />
      <path d="M100 98 C68 98 52 122 58 143 C64 163 136 163 142 143 C148 122 132 98 100 98 Z" fill="#fffcf4" />
      <path d="M86 56 Q93 44 98 56 Q104 44 111 57" fill="none" {...stroke} strokeWidth={5} />
      {/* whiskers */}
      <g {...stroke} strokeWidth={3.5}>
        <path d="M36 124 L60 129" /><path d="M38 140 L60 137" />
        <path d="M164 124 L140 129" /><path d="M162 140 L140 137" />
      </g>
      <ellipse cx={62} cy={136} rx={9} ry={5.5} fill="#d1271c" opacity={0.3} />
      <ellipse cx={138} cy={136} rx={9} ry={5.5} fill="#d1271c" opacity={0.3} />
      <Eyes mood={mood} />
      <path d="M91 123 Q100 118 109 123 Q105 131 100 132 Q95 131 91 123 Z" fill="#d1271c" {...stroke} strokeWidth={3.5} />
      <Mouth mood={mood} />
    </svg>
  );
}
