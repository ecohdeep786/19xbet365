import { useEffect, useRef, type RefObject } from "react";

let openDialogs = 0;

function lockPageScroll() {
  openDialogs += 1;
  document.body.classList.add("no-scroll");
}

function unlockPageScroll() {
  openDialogs = Math.max(0, openDialogs - 1);
  if (openDialogs === 0) document.body.classList.remove("no-scroll");
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

/**
 * Small dialog behaviour helper for the bet slip, mobile drawer and modals:
 * Escape closes, initial focus enters the panel, Tab cycles inside it and
 * focus returns to the trigger on close.
 */
export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;
    const focusables = () => node
      ? [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.getClientRects().length > 0)
      : [];
    const focusFrame = requestAnimationFrame(() => {
      const preferred = node?.querySelector<HTMLElement>("[data-autofocus]");
      (preferred && preferred.getClientRects().length ? preferred : focusables()[0])?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    lockPageScroll();
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      unlockPageScroll();
      previous?.focus?.();
    };
  }, [open, ref]);
}
