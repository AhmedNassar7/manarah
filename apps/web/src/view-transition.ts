import { useCallback, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

type DocumentWithTransitions = Document & { startViewTransition?: (update: () => void) => unknown };

/** True when the browser can crossfade between two DOM states and the person hasn't asked for less motion. */
function canTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof (document as DocumentWithTransitions).startViewTransition !== "function") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `update` (which must change the DOM synchronously) inside a view
 * transition — the browser crossfades old to new — or just runs it where that
 * isn't available or motion is reduced. The update always happens; only the
 * animation is optional.
 */
export function withViewTransition(update: () => void): void {
  if (!canTransition()) {
    update();
    return;
  }
  (document as DocumentWithTransitions).startViewTransition!(() => flushSync(update));
}

/** A click handler for links that navigates inside a view transition. Modified clicks (new tab etc.) are left to the browser. */
export function useTransitionLink(to: string) {
  const navigate = useNavigate();
  return useCallback(
    (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      withViewTransition(() => navigate(to));
    },
    [navigate, to],
  );
}
