/** Login may only return to a path on this site. */
export function safeAuthRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://cleanapp.invalid");
    return url.origin === "https://cleanapp.invalid" ? value : null;
  } catch {
    return null;
  }
}

/** The auth effect and form completion can both run for one successful login. */
export function redirectAfterLoginOnce(
  redirected: { current: boolean },
  queryRedirect: unknown,
  storage: Pick<Storage, "getItem" | "removeItem">,
  navigate: (path: string) => unknown,
): string | null {
  if (redirected.current) return null;
  let storedRedirect: string | null = null;
  try {
    storedRedirect = storage.getItem("authRedirect");
    storage.removeItem("authRedirect");
  } catch { /* Login can still finish when browser storage is unavailable. */ }
  const target = safeAuthRedirect(queryRedirect) || safeAuthRedirect(storedRedirect) || "/dashboard";
  redirected.current = true;
  navigate(target);
  return target;
}
