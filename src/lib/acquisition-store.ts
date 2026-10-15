import { appendFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { AcquisitionEvent } from "@/lib/acquisition";

const MAX_DAILY_BYTES = 5 * 1024 * 1024;
let pending = 0;
let queue: Promise<void> = Promise.resolve();
let prunedDay = "";

/** Durable host-mounted log: 5 MiB/day, expired days pruned on collection. No public read endpoint. */
export async function storeAcquisition(event: AcquisitionEvent): Promise<boolean> {
  const directory = process.env.ACQUISITION_EVENTS_DIR;
  if (!directory || pending >= 10) return false;
  pending++;
  let stored = false;
  const task = queue.then(async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (prunedDay !== day) {
      const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      for (const name of await readdir(directory)) {
        if (/^\d{4}-\d{2}-\d{2}\.ndjson$/.test(name) && name.slice(0, 10) <= cutoff) await unlink(path.join(directory, name));
      }
      prunedDay = day;
    }
    const file = path.join(directory, `${day}.ndjson`);
    const line = JSON.stringify({ hour: now.toISOString().slice(0, 13), ...event }) + "\n";
    let size = 0;
    try { size = (await stat(file)).size; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (size + Buffer.byteLength(line) > MAX_DAILY_BYTES) return;
    await appendFile(file, line, { encoding: "utf8", mode: 0o600 });
    stored = true;
  });
  queue = task.catch(() => {});
  try { await task; return stored; } finally { pending--; }
}
