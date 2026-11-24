import type { ReactElement } from "react";
import type { Game } from "../types";

function OrbitGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="80" cy="80" rx="58" ry="24" fill="none" stroke={accent} strokeOpacity=".38" strokeWidth="1.5" transform="rotate(-24 80 80)" />
      <ellipse cx="80" cy="80" rx="46" ry="17" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="1" transform="rotate(34 80 80)" />
      <circle cx="80" cy="80" r="20" fill={accent} fillOpacity=".16" stroke={accent} strokeWidth="1.5" />
      <path d="M80 64l4.3 11.7L96 80l-11.7 4.3L80 96l-4.3-11.7L64 80l11.7-4.3L80 64Z" fill={accent} />
      <circle cx="126" cy="63" r="4" fill="#fff" fillOpacity=".85" />
      <circle cx="35" cy="104" r="2.5" fill={accent} />
      <path d="M30 38h20M30 45h12" stroke="#fff" strokeOpacity=".22" strokeWidth="1.4" />
    </svg>
  );
}

function VaultGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <g fill="none" stroke={accent} strokeOpacity=".34">
        {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => (
          <rect key={`${row}-${col}`} x={48 + col * 18} y={44 + row * 18} width="14" height="14" rx="3" />
        )))}
      </g>
      <rect x="66" y="62" width="32" height="32" rx="8" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1.5" />
      <path d="M76 78l4 4 8-9" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="118" cy="112" r="9" fill="none" stroke="#fff" strokeOpacity=".18" />
      <path d="M30 122h40M30 128h26" stroke="#fff" strokeOpacity=".16" strokeWidth="1.4" />
    </svg>
  );
}

function PlinkoGlyph({ accent }: { accent: string }) {
  const rows = [3, 4, 5, 4, 3];
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      {rows.map((count, row) => Array.from({ length: count }).map((_, index) => (
        <circle
          key={`${row}-${index}`}
          cx={80 - (count - 1) * 11 + index * 22}
          cy={42 + row * 17}
          r="2.6"
          fill="#fff"
          fillOpacity={row === 4 ? ".7" : ".35"}
        />
      )))}
      <circle cx="91" cy="76" r="6" fill={accent} />
      <path d="M80 30v-12" stroke={accent} strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="3 4" />
      <path d="M44 126h72" stroke={accent} strokeOpacity=".3" />
      <path d="M54 126v10M80 126v14M106 126v10" stroke={accent} strokeOpacity=".25" />
    </svg>
  );
}

function DiceGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <g transform="rotate(-14 80 80)">
        <rect x="46" y="46" width="68" height="68" rx="16" fill={accent} fillOpacity=".14" stroke={accent} strokeWidth="1.6" />
        <circle cx="64" cy="64" r="4" fill={accent} /><circle cx="96" cy="64" r="4" fill="#fff" fillOpacity=".8" />
        <circle cx="80" cy="80" r="4" fill={accent} />
        <circle cx="64" cy="96" r="4" fill="#fff" fillOpacity=".8" /><circle cx="96" cy="96" r="4" fill={accent} />
      </g>
      <path d="M28 34l10 10M122 118l12 12M120 30l-8 8" stroke="#fff" strokeOpacity=".18" strokeWidth="1.4" />
    </svg>
  );
}

function WheelGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="49" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="12" />
      <circle cx="80" cy="80" r="49" fill="none" stroke={accent} strokeWidth="12" strokeDasharray="26 13" strokeOpacity=".62" />
      <circle cx="80" cy="80" r="35" fill={accent} fillOpacity=".1" stroke={accent} strokeOpacity=".5" />
      <path d="M80 43l7 20 21 2-16 14 5 21-17-11-17 11 5-21-16-14 21-2 7-20Z" fill={accent} />
      <path d="M80 20v12" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CoinGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="68" cy="88" rx="31" ry="31" fill="#fff" fillOpacity=".08" stroke="#fff" strokeOpacity=".18" />
      <circle cx="90" cy="72" r="31" fill={accent} fillOpacity=".16" stroke={accent} strokeWidth="1.6" />
      <path d="M90 54l5 13 14 .8-11 9 3.8 13.7L90 83l-11.8 7.5L82 76.8l-11-9 14-.8L90 54Z" fill={accent} />
      <path d="M42 38l8 8M112 116l9 9" stroke="#fff" strokeOpacity=".22" strokeWidth="1.4" />
    </svg>
  );
}

function CardsGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <g transform="rotate(-13 80 80)">
        <rect x="47" y="38" width="44" height="66" rx="7" fill="#fff" fillOpacity=".07" stroke="#fff" strokeOpacity=".2" />
      </g>
      <g transform="rotate(10 80 80)">
        <rect x="68" y="50" width="46" height="68" rx="7" fill={accent} fillOpacity=".14" stroke={accent} strokeWidth="1.5" />
        <path d="M78 64h9v16h-9z" fill={accent} fillOpacity=".3" />
        <text x="76" y="78" fill={accent} fontSize="17" fontFamily="Sora, sans-serif" fontWeight="700">A</text>
        <path d="M90 96l6 6 9-11" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function LuckyGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="40" fill={accent} fillOpacity=".1" stroke={accent} strokeOpacity=".32" strokeDasharray="4 7" />
      <circle cx="80" cy="80" r="29" fill="none" stroke="#fff" strokeOpacity=".12" />
      <text x="80" y="97" textAnchor="middle" fill={accent} fontSize="52" fontFamily="Sora, sans-serif" fontWeight="800">7</text>
      <circle cx="124" cy="45" r="2.5" fill="#fff" fillOpacity=".7" />
      <circle cx="34" cy="112" r="2" fill={accent} />
    </svg>
  );
}

function ReelsGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <rect x="30" y="46" width="100" height="68" rx="12" fill="#fff" fillOpacity=".05" stroke="#fff" strokeOpacity=".16" />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect x={38 + index * 29} y="54" width="23" height="52" rx="5" fill="#000" fillOpacity=".18" />
          <circle cx={49.5 + index * 29} cy="72" r="5" fill={index === 1 ? accent : "#fff"} fillOpacity={index === 1 ? "1" : ".3"} />
          <path d={`M${49.5 + index * 29} 88l4 7h-8l4-7Z`} fill={index === 2 ? accent : "#fff"} fillOpacity={index === 2 ? ".9" : ".26"} />
        </g>
      ))}
      <path d="M30 128h100" stroke={accent} strokeOpacity=".35" />
      <path d="M30 128l12-6M130 128l-12-6" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DerbyGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <path d="M24 108c22-38 42-38 56 0s34 38 56 0" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="10" strokeLinecap="round" />
      <path d="M24 108c22-38 42-38 56 0s34 38 56 0" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" />
      <circle cx="66" cy="80" r="9" fill={accent} />
      <circle cx="96" cy="98" r="7" fill="#fff" fillOpacity=".24" />
      <path d="M40 40h44M40 48h28M92 34h30M100 42h22" stroke="#fff" strokeOpacity=".16" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function LiveGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="80" cy="92" rx="50" ry="24" fill={accent} fillOpacity=".12" stroke={accent} strokeOpacity=".3" />
      <rect x="57" y="55" width="34" height="48" rx="5" fill="#fff" fillOpacity=".09" stroke="#fff" strokeOpacity=".32" transform="rotate(-8 74 79)" />
      <rect x="75" y="49" width="34" height="48" rx="5" fill={accent} fillOpacity=".14" stroke={accent} strokeWidth="1.4" transform="rotate(7 92 73)" />
      <text x="88" y="78" fill={accent} fontSize="18" fontFamily="Sora, sans-serif" fontWeight="700" transform="rotate(7 92 73)">A</text>
      <circle cx="117" cy="108" r="7" fill={accent} fillOpacity=".45" stroke={accent} />
      <circle cx="43" cy="105" r="5" fill="#fff" fillOpacity=".18" />
    </svg>
  );
}

const CATEGORY_GLYPHS: Record<string, (props: { accent: string }) => ReactElement> = {
  crash: OrbitGlyph,
  mines: VaultGlyph,
  plinko: PlinkoGlyph,
  dice: DiceGlyph,
  wheel: WheelGlyph,
  coinflip: CoinGlyph,
  cards: CardsGlyph,
  lucky: LuckyGlyph,
  slots: ReelsGlyph,
  "slots-provider": ReelsGlyph,
  racing: DerbyGlyph,
  virtuals: DerbyGlyph,
  "live-casino": LiveGlyph
};

const GLYPHS: Record<string, (props: { accent: string }) => ReactElement> = {
  orbit: OrbitGlyph,
  gem: VaultGlyph,
  bolt: PlinkoGlyph,
  flame: DiceGlyph,
  crown: LuckyGlyph,
  waves: CoinGlyph,
  coins: ReelsGlyph,
  sparkles: LuckyGlyph,
  live: LiveGlyph
};

export function GameArt({ game, className }: { game: Game; className?: string }) {
  const { from, to, accent, icon } = game.theme;
  const Glyph = CATEGORY_GLYPHS[game.category] || GLYPHS[icon] || OrbitGlyph;
  return (
    <div
      className={`game-art ${className || ""}`}
      style={{
        background: `radial-gradient(circle at 76% 18%, ${accent}33 0%, transparent 42%), linear-gradient(145deg, ${from} 0%, ${to} 78%, #040c16 100%)`
      }}
    >
      <div className="art-grid" />
      <div className="art-glow" style={{ background: accent }} />
      <div className="art-glyph"><Glyph accent={accent} /></div>
      <span className="art-corner top" style={{ borderColor: accent }} />
      <span className="art-corner bottom" style={{ borderColor: accent }} />
      <span className="art-noise" />
    </div>
  );
}
