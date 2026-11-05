import { useEffect } from "react";
import { Icon, type IconName } from "./icons/Icon.js";

export interface ToastProps {
  /** The message; when it changes, the toast shows again. Undefined hides it. */
  message: string | undefined;
  /** Counts up with each new message, so the same text shown twice still re-triggers. */
  id: number;
  icon?: IconName;
  onDismiss: () => void;
  /** How long it stays, in ms. */
  duration?: number;
}

/** A small, polite message that slides in at the bottom of the screen and goes away on its own — screen readers hear it, nothing needs tapping. */
export function Toast({ message, id, icon = "sparkles", onDismiss, duration = 3600 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [message, id, duration, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={id}>
      <Icon name={icon} size={20} />
      <span>{message}</span>
    </div>
  );
}
