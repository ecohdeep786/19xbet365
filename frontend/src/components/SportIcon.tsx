import type { ReactNode } from "react";

/**
 * Original sport marks for 19xbet365. The shapes are deliberately simple and
 * high-contrast so they remain legible at 14–18px in the sports rail, league
 * headers and mobile lists. Every mark is drawn from primitives in this file;
 * no third-party sport or operator icon assets are used.
 */

const GLYPHS: Record<string, ReactNode> = {
  football: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.3l3.2 2.3-1.2 3.8H10l-1.2-3.8L12 7.3z" fill="currentColor" fillOpacity=".18" />
      <path d="M12 3.5v3.8M19.7 9.3l-4.5.3M16.9 18.7l-2.9-3.5M7.1 18.7l2.9-3.5M4.3 9.3l4.5.3" />
    </>
  ),
  cricket: (
    <>
      <path d="M4.8 17.8L14 8.6" strokeWidth="3.4" />
      <path d="M14.9 7.7l3.1-3.1" strokeWidth="1.8" />
      <circle cx="19.2" cy="4.8" r="1.6" fill="currentColor" stroke="none" />
      <path d="M4 20.5c2.8.6 5.8.1 8.2-1.5" opacity=".45" />
    </>
  ),
  tennis: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M5.3 5.9c4.6 2 7.6 6.3 8.9 12.3M18.7 5.9c-4.6 2-7.6 6.3-8.9 12.3" />
    </>
  ),
  "table-tennis": (
    <>
      <ellipse cx="10.2" cy="10.2" rx="6.1" ry="6.8" transform="rotate(-28 10.2 10.2)" />
      <path d="M14.6 15.1l3.6 3.6" strokeWidth="2.6" />
      <circle cx="19.2" cy="5.2" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  basketball: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4v17.2" />
      <path d="M6.1 5.9c3 3.3 3 8.9 0 12.2M17.9 5.9c-3 3.3-3 8.9 0 12.2" />
    </>
  ),
  "ice-hockey": (
    <>
      <path d="M5.5 3.8l7 11.8c.8 1.4 2.2 2.2 3.8 2.2h3" strokeWidth="2" />
      <ellipse cx="6" cy="19.2" rx="4.4" ry="1.7" fill="currentColor" fillOpacity=".16" />
      <path d="M18.8 3.5l1.7 3.1" opacity=".55" />
    </>
  ),
  esports: (
    <>
      <path d="M7.4 7h9.2c2.6 0 4.4 2.2 3.9 4.8l-.7 3.9c-.3 1.6-2.2 2.2-3.5 1.2l-1.8-1.5a2 2 0 0 0-2.4 0l-1.8 1.5c-1.3 1-3.2.4-3.5-1.2l-.7-3.9C3 9.2 4.8 7 7.4 7z" />
      <path d="M7.8 11.2h2.8M9.2 9.8v2.8" />
      <circle cx="15.7" cy="10.7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="12.8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  "horse-racing": (
    <>
      <path d="M6.2 19.6v-5.2a5.8 5.8 0 0 1 11.6 0v5.2" strokeWidth="2.2" />
      <path d="M4.3 17.8h4.2M15.5 17.8h4.2" />
      <circle cx="8.2" cy="10.3" r=".65" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="10.3" r=".65" fill="currentColor" stroke="none" />
      <path d="M9.5 14.2h5" opacity=".45" />
    </>
  ),
  volleyball: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 3.4c-.8 4.3 1.4 7.6 5.9 9.8M12 20.6c.8-4.3-1.4-7.6-5.9-9.8M4.1 7.6c4.2 1.2 7.5.4 10.2-2.4M19.9 16.4c-4.2-1.2-7.5-.4-10.2 2.4" />
    </>
  ),
  mma: (
    <>
      <path d="M4.5 13.3V9.5a3.2 3.2 0 0 1 3.2-3.2h5.1a4.8 4.8 0 0 1 4.8 4.8v1.2c0 1.8-.9 3.4-2.3 4.4l-2.9 2a4.1 4.1 0 0 1-4.3 0l-2.1-1.4a4 4 0 0 1-1.5-4z" />
      <path d="M7.3 12.1c2.7.5 5.7.2 8.6-.9M8.4 9.1h4.8" />
      <path d="M8.6 4.9V3.2M11.2 4.6V2.8" opacity=".55" />
    </>
  ),
  baseball: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M5.7 5.4c3.3 2 5.3 4.9 6.1 8.5M18.3 5.4c-3.3 2-5.3 4.9-6.1 8.5" />
      <path d="M8.7 4.5c1 1.3 1.7 2.7 2.1 4.2M15.3 4.5c-1 1.3-1.7 2.7-2.1 4.2" opacity=".65" />
    </>
  ),
  badminton: (
    <>
      <path d="M6.2 3.5l3.2 7.3M17.8 3.5l-3.2 7.3M8.5 3l3.5 7.6L15.5 3" />
      <path d="M8.3 10.7h7.4L14 13.5a2.7 2.7 0 0 1-4 0l-1.7-2.8z" fill="currentColor" fillOpacity=".16" />
      <circle cx="12" cy="17.2" r="2" />
    </>
  ),
  darts: (
    <>
      <circle cx="10.5" cy="10.5" r="7.4" />
      <circle cx="10.5" cy="10.5" r="4.1" />
      <circle cx="10.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M14.8 14.8l4.6 4.6M17.1 11.4l3.9 1.6-2.3 2.3-1.6-3.9z" fill="currentColor" fillOpacity=".2" />
    </>
  ),
  "motor-sport": (
    <>
      <path d="M5 13a7 7 0 0 1 14 0v2.5a2.5 2.5 0 0 1-2.5 2.5H9a4 4 0 0 1-4-4V13z" />
      <path d="M5.4 12h10.8l2.7 1.7M8 15.5h4.5" />
    </>
  ),
  snooker: (
    <>
      <circle cx="9" cy="15" r="3.2" />
      <path d="M12 12.6L20 4.6" strokeWidth="2.2" />
      <path d="M18.1 3.2l2.7 2.7" strokeWidth="2.2" />
    </>
  ),
  handball: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M8.2 5.3c1.5 2.9 1.5 6 0 8.9M15.8 5.3c-1.5 2.9-1.5 6 0 8.9M4.8 9.4h14.4" opacity=".75" />
    </>
  ),
  "aussie-rules": (
    <>
      <ellipse cx="12" cy="12" rx="5.4" ry="8.1" transform="rotate(45 12 12)" />
      <path d="M8.6 8.6l6.8 6.8M9.8 7.1l1.3 1.3M11.7 9l1.3 1.3M13.6 10.9l1.3 1.3" />
    </>
  ),
  default: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M4.4 9.4c4.6 1.4 9.8 1.1 14.4-.9M5.3 15.6c4.1-2.2 8.2-2.5 13.1-.8M9.7 4.1c1.7 5.1 1.6 10.6-.3 15.7" />
    </>
  )
};

export function SportIcon({ sport, size = 18, className }: { sport: string; size?: number; className?: string }) {
  const glyph = GLYPHS[sport] || GLYPHS.default;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-sport={sport}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
