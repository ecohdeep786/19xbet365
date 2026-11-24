import { useId, type ReactNode } from "react";
import type { Game } from "../types";

/**
 * Original illustrated cover art for 19xbet365. Each scene is hand-built from
 * SVG primitives and the game's stored theme tokens. The full-bleed scenes are
 * intentionally picture-led (not a single generic glyph) so catalogue cards
 * read as game covers at a glance, including provider-only titles.
 */

type SceneProps = { accent: string; uid: string };

const STARS = [
  [38, 52, 1.4], [74, 92, 1], [112, 40, 1.8], [250, 42, 1.2], [286, 118, 1.6],
  [36, 160, 1], [272, 196, 1], [214, 30, 0.9], [302, 270, 1.1], [28, 286, 0.8]
];

function CoverDefs({ accent, from, to, uid }: { accent: string; from: string; to: string; uid: string }) {
  return (
    <defs>
      <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={from} />
        <stop offset=".62" stopColor={to} />
        <stop offset="1" stopColor="#030912" />
      </linearGradient>
      <radialGradient id={`halo${uid}`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={accent} stopOpacity=".62" />
        <stop offset="1" stopColor={accent} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`orb${uid}`} cx="35%" cy="28%" r="72%">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".98" />
        <stop offset=".32" stopColor={accent} />
        <stop offset="1" stopColor="#06101d" />
      </radialGradient>
      <linearGradient id={`metal${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".32" stopColor={accent} />
        <stop offset="1" stopColor="#08111e" />
      </linearGradient>
      <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#030912" stopOpacity="0" />
        <stop offset=".55" stopColor="#030912" stopOpacity=".38" />
        <stop offset="1" stopColor="#030912" stopOpacity=".92" />
      </linearGradient>
      <linearGradient id={`gloss${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".4" />
        <stop offset=".5" stopColor="#ffffff" stopOpacity=".04" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <filter id={`blur${uid}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id={`soft${uid}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

function Frame({ accent, uid, children }: SceneProps & { children: ReactNode }) {
  return (
    <>
      <rect width="320" height="400" fill={`url(#bg${uid})`} />
      <circle cx="244" cy="82" r="150" fill={`url(#halo${uid})`} opacity=".5" />
      <path d="M0 302L320 258V400H0Z" fill="#02070f" opacity=".35" />
      <g opacity=".28">
        {STARS.map(([x, y, r], index) => <circle key={index} cx={x} cy={y} r={r} fill="#e8f7ff" />)}
      </g>
      <g stroke="#d8ecff" strokeOpacity=".12" strokeWidth="1">
        {[80, 150, 220, 290].map((y) => <path key={y} d={`M0 ${y}H320`} />)}
        {[52, 116, 180, 244, 308].map((x) => <path key={x} d={`M${x} 0V310`} opacity=".38" />)}
      </g>
      {children}
      <rect width="320" height="400" fill={`url(#fade${uid})`} />
      <rect width="320" height="400" fill="none" stroke={accent} strokeOpacity=".22" />
    </>
  );
}

function CrashScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 178)">
      <circle r="112" fill="none" stroke={accent} strokeOpacity=".18" />
      <circle r="82" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeDasharray="2 8" />
      <ellipse cx="0" cy="18" rx="128" ry="40" fill="none" stroke={accent} strokeOpacity=".38" strokeWidth="2" transform="rotate(-18)" />
      <ellipse cx="0" cy="18" rx="102" ry="28" fill="none" stroke="#ffffff" strokeOpacity=".12" transform="rotate(28)" />
      <circle cx="78" cy="-58" r="13" fill={`url(#orb${uid})`} />
      <path d="M-8-92c25 24 33 61 23 100l-23 17-23-17c-10-39-2-76 23-100Z" fill="#e9f8ff" />
      <path d="M-31 24l-27 33 29-6 29 6-27-33" fill={accent} />
      <circle cx="-2" cy="-48" r="11" fill="#09223a" stroke="#ffffff" strokeOpacity=".65" strokeWidth="2" />
      <path d="M-3 24c-8 25-2 48 2 62 5-14 11-37 3-62Z" fill={`url(#metal${uid})`} opacity=".9" />
      <path d="M-2 87c4 10 9 18 14 24-2-11-5-20-9-27Z" fill="#ffd27a" />
      <g opacity=".7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round">
        <path d="M-54 66h26M43 54h31M-78 94h18" />
      </g>
      <g fill="#7ad9ff" opacity=".72">
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-134 + i * 48} y={118 + (i % 2) * 8} width="23" height={34 - (i % 3) * 7} />)}
      </g>
    </g>
  );
}

function VaultScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 176)">
      <circle r="118" fill={`url(#halo${uid})`} opacity=".55" />
      <rect x="-86" y="-100" width="172" height="222" rx="18" fill="#100a23" stroke={accent} strokeOpacity=".38" />
      <path d="M-16-100h84a18 18 0 0 1 18 18v186a18 18 0 0 1-18 18h-84Z" fill="#1a1035" stroke={accent} strokeOpacity=".4" />
      <g transform="translate(-46 -14)">
        <circle r="63" fill="#1a123b" stroke={accent} strokeWidth="5" />
        <circle r="48" fill="none" stroke="#ffffff" strokeOpacity=".18" />
        <circle r="31" fill={`url(#metal${uid})`} opacity=".8" />
        <g stroke="#ffffff" strokeOpacity=".5" strokeWidth="2">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => <circle key={deg} cx={Math.cos(deg * Math.PI / 180) * 56} cy={Math.sin(deg * Math.PI / 180) * 56} r="3" fill="#ffffff" stroke="none" />)}
        </g>
        <path d="M-9-6h18v15H-9z" fill={accent} opacity=".55" />
      </g>
      <g transform="translate(44 -14)" opacity=".9">
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => (
          <g key={`${row}-${col}`} transform={`translate(${col * 34} ${row * 34})`}>
            <rect width="25" height="25" rx="4" fill={accent} fillOpacity=".08" stroke={accent} strokeOpacity=".38" />
            <path d="M12.5 7l4 5-4 6-4-6 4-5Z" fill={accent} opacity={row === 1 && col === 1 ? "1" : ".42"} />
          </g>
        )))}
      </g>
      <g fill={accent}>
        <path d="M99-70l6 12 13 2-9 10 2 13-12-6-12 6 2-13-9-10 13-2 6-12Z" opacity=".8" />
        <path d="M-102 74l4 8 9 1-7 7 2 9-8-5-8 5 2-9-7-7 9-1 4-8Z" opacity=".45" />
      </g>
      <path d="M-120 122h240" stroke={accent} strokeOpacity=".3" />
    </g>
  );
}

function PlinkoScene({ accent, uid }: SceneProps) {
  const rows = [4, 5, 6, 7, 6, 5, 4];
  return (
    <g transform="translate(160 172)">
      <path d="M-114-112h228L30 114h-60Z" fill="#071a18" stroke={accent} strokeOpacity=".35" />
      <g fill="#ffffff">
        {rows.map((count, row) => Array.from({ length: count }).map((_, index) => (
          <circle
            key={`${row}-${index}`}
            cx={-(count - 1) * 15 + index * 30}
            cy={-82 + row * 28}
            r={row === 3 ? 4.4 : 3.2}
            fillOpacity={row === 3 ? ".9" : ".5"}
          />
        )))}
      </g>
      <circle cx="15" cy="-4" r="12" fill={`url(#orb${uid})`} filter={`url(#soft${uid})`} />
      <path d="M15-4c2 22 4 38 7 52" stroke={accent} strokeOpacity=".5" strokeWidth="3" strokeDasharray="3 6" />
      <g transform="translate(0 122)">
        {[-84, -42, 0, 42, 84].map((x, index) => (
          <g key={x}>
            <path d={`M${x - 18} 0h36l-8 33h-20Z`} fill={index === 2 ? accent : "#0b2228"} stroke={accent} strokeOpacity=".45" />
            <path d={`M${x - 9} 8h18`} stroke={index === 2 ? "#04110c" : accent} strokeOpacity=".55" />
          </g>
        ))}
      </g>
      <path d="M-134-118h-14v236M134-118h14v236" stroke="#ffffff" strokeOpacity=".12" />
    </g>
  );
}

function DiceScene({ accent, uid }: SceneProps) {
  const pips = [[-19, -22], [19, -22], [-19, 0], [19, 0], [-19, 22], [19, 22]];
  return (
    <g transform="translate(160 184)">
      <ellipse cx="0" cy="112" rx="120" ry="28" fill="#050912" opacity=".6" />
      <g transform="rotate(-17) translate(-42 -4)">
        <rect x="-58" y="-58" width="116" height="116" rx="22" fill="#2d0b15" stroke="#ff9baf" strokeOpacity=".35" />
        <rect x="-52" y="-52" width="104" height="104" rx="18" fill={`url(#metal${uid})`} opacity=".22" />
        <g fill="#ffeaf0">
          {[[-30, -30], [30, -30], [0, 0], [-30, 30], [30, 30]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />)}
        </g>
        <path d="M-52-52h104v30H-52Z" fill={`url(#gloss${uid})`} />
      </g>
      <g transform="rotate(18) translate(56 62)">
        <rect x="-46" y="-46" width="92" height="92" rx="19" fill="#3a0d18" stroke="#ffb5c2" strokeOpacity=".3" />
        <g fill="#ffeaf0">
          {pips.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5.4" />)}
        </g>
        <path d="M-46-46h92v24H-46Z" fill={`url(#gloss${uid})`} />
      </g>
      <g stroke="#ff819b" strokeOpacity=".5" strokeLinecap="round">
        <path d="M-112-80l18 12M96-92l22-10M-104 80l-18 12M112 104l20 14" />
      </g>
    </g>
  );
}

function WheelScene({ accent, uid }: SceneProps) {
  const segments = 12;
  return (
    <g transform="translate(160 180)">
      <circle r="112" fill={`url(#halo${uid})`} opacity=".5" />
      <circle r="102" fill="#08152d" stroke={accent} strokeWidth="4" />
      <g>
        {Array.from({ length: segments }).map((_, index) => {
          const start = (index * 360) / segments;
          const end = ((index + 1) * 360) / segments;
          const p = (angle: number, radius: number) => {
            const rad = (angle * Math.PI) / 180;
            return `${Math.cos(rad) * radius} ${Math.sin(rad) * radius}`;
          };
          return (
            <path
              key={index}
              d={`M0 0L${p(start, 96)}A96 96 0 0 1 ${p(end, 96)}Z`}
              fill={index % 2 ? accent : "#132744"}
              fillOpacity={index % 2 ? ".72" : "1"}
              stroke="#06101f"
              strokeWidth="1"
            />
          );
        })}
      </g>
      <circle r="35" fill="#08152d" stroke={accent} strokeWidth="3" />
      <path d="M0-20l7 16 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2 7-16Z" fill={accent} />
      <path d="M0-126l10 20h-20Z" fill="#ffffff" />
      <circle r="106" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeDasharray="2 7" />
    </g>
  );
}

function CoinScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 184)">
      <ellipse cx="0" cy="100" rx="115" ry="26" fill="#04101a" opacity=".7" />
      <g transform="rotate(-16) translate(-42 -22)">
        <ellipse cx="0" cy="0" rx="53" ry="53" fill="#f2be53" stroke="#fff1bb" strokeWidth="2" />
        <circle r="39" fill="none" stroke="#9f6c13" strokeOpacity=".5" />
        <path d="M0-24l7 15 17 2-13 11 4 16-15-9-15 9 4-16-13-11 17-2 7-15Z" fill="#fff3c7" />
      </g>
      <g transform="rotate(16) translate(54 26)">
        <ellipse cx="0" cy="0" rx="48" ry="48" fill="#d8e6f2" stroke="#ffffff" strokeWidth="2" />
        <circle r="35" fill="none" stroke="#6f8ca3" strokeOpacity=".5" />
        <path d="M0-20l6 13 14 2-11 9 3 14-12-7-12 7 3-14-11-9 14-2 6-13Z" fill="#ffffff" />
      </g>
      <path d="M-116 42c30-22 58-28 84-18M112 58c-26-22-54-28-80-18" stroke={accent} strokeOpacity=".4" strokeDasharray="4 7" />
      <g fill="#ffffff" opacity=".6">
        <circle cx="-112" cy="-76" r="2" /><circle cx="104" cy="-88" r="2.5" /><circle cx="118" cy="26" r="1.5" />
      </g>
    </g>
  );
}

function CardsScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 180)">
      <ellipse cx="0" cy="108" rx="124" ry="28" fill="#050a12" opacity=".55" />
      <g transform="rotate(-18) translate(-40 2)">
        <rect x="-48" y="-68" width="96" height="136" rx="11" fill="#f7ead2" stroke="#ffe0a4" strokeOpacity=".5" />
        <path d="M0-34l15 18-15 22-15-22 15-18Z" fill={accent} />
        <path d="M-34-48h20M-34-40h12" stroke="#6d4b2a" strokeOpacity=".35" strokeWidth="3" />
      </g>
      <g transform="rotate(8) translate(26 18)">
        <rect x="-48" y="-68" width="96" height="136" rx="11" fill="#fff5df" stroke="#ffd489" />
        <circle cx="0" cy="-10" r="19" fill={accent} opacity=".16" />
        <path d="M0-31l7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2 7-14Z" fill="#2b1608" opacity=".55" />
        <path d="M-34-52h22M-34-44h13" stroke="#73502d" strokeOpacity=".35" strokeWidth="3" />
      </g>
      <g transform="translate(94 86)">
        <ellipse cx="0" cy="0" rx="25" ry="9" fill="#0b1b2d" stroke={accent} strokeOpacity=".5" />
        <ellipse cx="0" cy="-8" rx="25" ry="9" fill="#143352" stroke={accent} strokeOpacity=".7" />
        <ellipse cx="0" cy="-16" rx="25" ry="9" fill="#1a4268" stroke={accent} />
      </g>
      <g transform="translate(-108 90)" opacity=".8">
        <ellipse rx="19" ry="7" fill={accent} opacity=".4" />
        <ellipse cy="-7" rx="19" ry="7" fill={accent} opacity=".7" />
        <ellipse cy="-14" rx="19" ry="7" fill={accent} />
      </g>
    </g>
  );
}

function LuckyScene({ accent, uid }: SceneProps) {
  const balls = [[-68, -25, 39], [28, -50, 31], [70, 25, 26], [-24, 52, 33]];
  return (
    <g transform="translate(160 180)">
      <circle r="120" fill={`url(#halo${uid})`} opacity=".52" />
      {balls.map(([x, y, r], index) => (
        <g key={index} transform={`translate(${x} ${y})`}>
          <circle r={r} fill={`url(#orb${uid})`} stroke="#ffffff" strokeOpacity=".24" />
          <path d="M0 0l6 12 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2 6-12Z" fill="#ffffff" opacity={index === 1 ? ".9" : ".5"} transform={`scale(${r / 42})`} />
        </g>
      ))}
      <g fill={accent}>
        {[[-128, -80], [120, -70], [112, 108], [-108, 115], [2, -118]].map(([x, y], index) => <circle key={index} cx={x} cy={y} r="5" opacity=".55" />)}
      </g>
      <g stroke={accent} strokeWidth="2" strokeOpacity=".35">
        <path d="M-125 18l16 12M104-44l18-10M-94-94l12-12" />
      </g>
    </g>
  );
}

function SlotsScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 176)">
      <rect x="-109" y="-112" width="218" height="242" rx="20" fill="#0b1637" stroke={accent} strokeOpacity=".45" strokeWidth="2" />
      <rect x="-94" y="-88" width="188" height="154" rx="12" fill="#050c1c" stroke="#ffffff" strokeOpacity=".16" />
      {[-64, 0, 64].map((x, reel) => (
        <g key={x} transform={`translate(${x} -11)`}>
          <rect x="-27" y="-68" width="54" height="140" rx="8" fill="#0d1b3b" stroke="#ffffff" strokeOpacity=".12" />
          <path d="M-14-44c11-14 24-11 20 3-3 11-17 13-20 3-3-10 4-16 11-14 7 2 9 9 5 14" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <path d="M-15 42l7-15 8 15 8-15 7 15" fill="none" stroke="#f6c45a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="0" cy="82" r="4" fill={accent} />
          <path d={`M-20-74h40`} stroke={reel === 1 ? accent : "#ffffff"} strokeOpacity=".4" />
        </g>
      ))}
      <path d="M-126-94v190M126-94v190" stroke={accent} strokeOpacity=".22" />
      <g fill="#f6c45a">
        <circle cx="-120" cy="-108" r="5" /><circle cx="120" cy="-108" r="5" /><circle cx="-120" cy="116" r="5" /><circle cx="120" cy="116" r="5" />
      </g>
      <g transform="translate(0 98)">
        <rect x="-58" y="0" width="116" height="16" rx="8" fill={accent} opacity=".22" stroke={accent} strokeOpacity=".45" />
      </g>
    </g>
  );
}

function RacingScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 184)">
      <path d="M-140 104c58-80 222-80 280 0" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="34" strokeLinecap="round" />
      <path d="M-140 104c58-80 222-80 280 0" fill="none" stroke={accent} strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 10" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${-58 + i * 58} ${18 + i * -13}) scale(${1 - i * .08})`}>
          <ellipse cx="0" cy="42" rx="38" ry="7" fill="#030812" opacity=".55" />
          <path d="M-30 24c8-18 30-24 48-14 10 6 15 15 16 26l-8 3-8-13-26 4-8 12-9-3c0-6 2-11 5-15Z" fill="#1b3754" stroke={accent} strokeOpacity=".55" strokeWidth="1.5" />
          <path d="M17 9l8-23 11 2-3 16 10 9-7 7-11-6Z" fill="#1b3754" stroke={accent} strokeOpacity=".55" strokeWidth="1.5" />
          <circle cx="18" cy="27" r="8" fill={accent} />
          <path d="M-22 31l-7 28M-8 34l-4 25M8 34l4 25M22 31l8 28" stroke="#1b3754" strokeWidth="5" strokeLinecap="round" />
          <path d="M-30 10c-11 4-20 2-26-6" fill="none" stroke="#ffffff" strokeOpacity=".4" strokeWidth="3" />
        </g>
      ))}
      <g stroke={accent} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round">
        <path d="M-92-32h54M-112-20h40M60-46h62M78-32h34" />
      </g>
      <g transform="translate(114 -76)">
        <path d="M0 0v82M-18 0h24" stroke="#ffffff" strokeOpacity=".4" strokeWidth="4" />
        <path d="M0 0h32l-8 12 8 12H0Z" fill={accent} opacity=".7" />
      </g>
    </g>
  );
}

function LiveScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 186)">
      <ellipse cx="0" cy="89" rx="138" ry="53" fill="#160c16" stroke={accent} strokeOpacity=".35" />
      <ellipse cx="0" cy="75" rx="126" ry="44" fill="#26101f" stroke="#ffffff" strokeOpacity=".1" />
      <g transform="translate(-48 -13)">
        <circle r="52" fill="#0a1220" stroke="#f1c56d" strokeWidth="3" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI * 2) / 8;
          return <path key={i} d={`M0 0L${Math.cos(a) * 44} ${Math.sin(a) * 44}`} stroke={i % 2 ? accent : "#f1c56d"} strokeWidth="3" opacity=".55" />;
        })}
        <circle r="13" fill="#f1c56d" />
      </g>
      <g transform="translate(63 8) rotate(9)">
        <rect x="-33" y="-47" width="66" height="94" rx="8" fill="#fff0e7" stroke="#ffd29c" />
        <path d="M0-22l10 12-10 16-10-16 10-12Z" fill={accent} />
        <circle cx="0" cy="19" r="9" fill="none" stroke={accent} strokeWidth="2" />
      </g>
      <g transform="translate(99 57)">
        <ellipse rx="22" ry="7" fill={accent} opacity=".4" />
        <ellipse cy="-7" rx="22" ry="7" fill={accent} opacity=".65" />
        <ellipse cy="-14" rx="22" ry="7" fill={accent} />
      </g>
      <g fill="#f1c56d" opacity=".7">
        <circle cx="-106" cy="-62" r="3" /><circle cx="113" cy="-80" r="2" /><circle cx="52" cy="-102" r="2.5" />
      </g>
    </g>
  );
}

function InstantScene({ accent, uid }: SceneProps) {
  return (
    <g transform="translate(160 178)">
      <g transform="rotate(-8)">
        <rect x="-92" y="-106" width="184" height="212" rx="20" fill="#0a1526" stroke={accent} strokeOpacity=".5" strokeWidth="2" />
        <path d="M-74-88h148v52H-74Z" fill={accent} opacity=".16" />
        <path d="M-74-19h148M-74 4h92M-74 27h122M-74 50h76" stroke="#ffffff" strokeOpacity=".25" strokeWidth="5" strokeLinecap="round" />
        <g transform="translate(0 93)">
          <circle r="27" fill={accent} fillOpacity=".16" stroke={accent} />
          <path d="M0-13l4 9 10 1-7 7 2 9-9-5-9 5 2-9-7-7 10-1 4-9Z" fill={accent} />
        </g>
        <path d="M56-84l20 20M70-88l16 16" stroke="#ffffff" strokeOpacity=".18" strokeWidth="2" />
      </g>
      <g fill="#ffffff" opacity=".55">
        <circle cx="-118" cy="-42" r="2.5" /><circle cx="120" cy="-30" r="2" /><circle cx="106" cy="92" r="3" />
      </g>
    </g>
  );
}

const SCENES: Record<string, (props: SceneProps) => ReactNode> = {
  crash: CrashScene,
  mines: VaultScene,
  plinko: PlinkoScene,
  dice: DiceScene,
  wheel: WheelScene,
  coinflip: CoinScene,
  cards: CardsScene,
  lucky: LuckyScene,
  slots: SlotsScene,
  "slots-provider": SlotsScene,
  racing: RacingScene,
  virtuals: RacingScene,
  "live-casino": LiveScene,
  instant: InstantScene
};

const GAME_SCENES: Record<string, (props: SceneProps) => ReactNode> = {
  "astra-roulette-live": LiveScene,
  "blackjack-azure": CardsScene,
  "baccarat-royale": CardsScene,
  "dream-wheel-live": WheelScene,
  "holdem-prime": CardsScene,
  "sicbo-nova": DiceScene,
  "speed-baccarat": CardsScene
};

export function GameArt({ game, className }: { game: Game; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { from, to, accent } = game.theme;
  const Scene = GAME_SCENES[game.id] || SCENES[game.category] || SlotsScene;
  return (
    <div className={`game-art ${className || ""}`} style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}>
      <svg className="game-scene" viewBox="0 0 320 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <CoverDefs accent={accent} from={from} to={to} uid={uid} />
        <Frame accent={accent} uid={uid}>
          <Scene accent={accent} uid={uid} />
        </Frame>
      </svg>
      <span className="art-noise" />
    </div>
  );
}
