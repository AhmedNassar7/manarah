import { useCallback, useEffect, useState } from "react";
import {
  INSTALL_NUDGE_DELAY_MS,
  INSTALL_NUDGE_STORAGE_KEY,
  dismissInstallNudge,
  normalizeInstallNudge,
  shouldShowInstallNudge,
  type InstallNudgeState,
} from "@manarah/core";
import type { InstallState } from "./install.js";

/**
 * Whether to show the "Install Manarah" card right now. The answer ("Not now" and when) is kept
 * in this browser only — installing is a per-device thing, so it is not part of synced settings.
 * `hold` keeps it away from screens where a card at the bottom would be in the way (the tasbih,
 * where the thumb taps the lower half of the screen).
 */

function load(): InstallNudgeState {
  try {
    const raw = localStorage.getItem(INSTALL_NUDGE_STORAGE_KEY);
    return normalizeInstallNudge(raw ? JSON.parse(raw) : null);
  } catch {
    return { dismissals: 0 };
  }
}

function save(state: InstallNudgeState) {
  try {
    localStorage.setItem(INSTALL_NUDGE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private window): it will simply ask again next visit.
  }
}

export function useInstallNudge(install: InstallState, hold: boolean): { show: boolean; dismiss: () => void } {
  const [state, setState] = useState(load);
  const [waited, setWaited] = useState(false);
  const [dismissedNow, setDismissedNow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), INSTALL_NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setDismissedNow(true); // gone for the rest of this visit, whatever happens to storage
    setState((previous) => {
      const next = dismissInstallNudge(previous, Date.now());
      save(next);
      return next;
    });
  }, []);

  const show = waited && !hold && !dismissedNow && shouldShowInstallNudge({ state, now: Date.now(), ...install });
  return { show, dismiss };
}
