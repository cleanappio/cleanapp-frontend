/** A server-only public lookup, bounded through headers and the complete JSON body. */
export async function fetchPublicSeoJson(url: string, timeoutMs = 4000): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Public metadata request timed out"));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {
          headers: { Accept: "application/json" }, signal: controller.signal,
          cache: "no-store", credentials: "omit",
        });
        return { status: response.status, data: response.ok ? await response.json() as unknown : null };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function publicSeoText(value: unknown, limit = 500): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
}

export function isPublicSeoObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Temporary upstream failures must invite retry, not a successful noindex page. */
export function publicSeoUnavailable(res: { statusCode: number; setHeader(name: string, value: string): void }): void {
  res.statusCode = 503;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Retry-After", "60");
}
