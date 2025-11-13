// Shared cache module for report caching
// This allows both the cache API route and invalidation route to access the same cache

export interface CacheEntry {
  data: any;
  timestamp: number; // Creation time for TTL validation
  lastAccess: number; // Last access time for LRU eviction
}

export const cache = new Map<string, CacheEntry>();
export const inFlightRequests = new Map<string, Promise<any>>();
export const CACHE_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

/**
 * Invalidate a specific cache entry by sequence number
 * @param seq The report sequence number to invalidate
 * @returns true if entry was found and deleted, false otherwise
 */
export function invalidateCacheEntry(seq: string | number): boolean {
  const cacheKey = `report-seq-${seq}`;
  const deleted = cache.delete(cacheKey);
  // Also remove from in-flight requests if present
  inFlightRequests.delete(cacheKey);
  return deleted;
}

/**
 * Invalidate multiple cache entries by sequence numbers
 * @param seqs Array of report sequence numbers to invalidate
 * @returns Number of entries successfully invalidated
 */
export function invalidateCacheEntries(seqs: (string | number)[]): number {
  let count = 0;
  for (const seq of seqs) {
    if (invalidateCacheEntry(seq)) {
      count++;
    }
  }
  return count;
}
