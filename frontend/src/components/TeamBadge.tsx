import type { CSSProperties } from "react";

const STOP_WORDS = new Set(["fc", "cf", "sc", "afc", "bc", "ac", "united", "city"]);

function initialsFor(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()));
  if (!words.length) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function hueFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

/**
 * A deterministic, original club mark. Real clubs and competitions own their
 * crests, so 19xbet365 uses initials inside a generated colour field instead
 * of copying team artwork.
 */
export function TeamBadge({ name, size = 22 }: { name: string; size?: number }) {
  const hue = hueFor(name);
  return (
    <span
      className="team-badge"
      style={{
        "--team-hue": hue,
        "--team-hue-2": (hue + 28) % 360,
        width: size,
        height: size,
        fontSize: Math.max(7, Math.round(size * 0.34))
      } as CSSProperties}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
