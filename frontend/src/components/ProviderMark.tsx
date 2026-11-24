import type { CSSProperties } from "react";

function initialsFor(name: string) {
  if (/^19x/i.test(name)) return "19";
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function hueFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

/** Original provider monogram used on catalogue cards. */
export function ProviderMark({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <span
      className="provider-mark"
      style={{ "--provider-hue": hueFor(name), width: size, height: size, fontSize: Math.max(6, Math.round(size * 0.38)) } as CSSProperties}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
