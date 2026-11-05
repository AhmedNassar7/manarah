/**
 * The address a friend should open: this app's own, wherever it is hosted — the
 * page's origin and path without the in-app route (`#/…`) or any query. Computed
 * at the moment of sharing so a move to another host needs no change here.
 */
export function appShareUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}
