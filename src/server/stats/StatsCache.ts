import {ServiceError} from '../services/ServiceError';

/** Bounded per-process cache. Share in-flight work; failed queries are never cached. */
export class StatsCache {
  private readonly entries = new Map<string, {expiresAt: number; result: Promise<unknown>}>();
  private active = 0;

  constructor(private readonly now: () => number = Date.now, private readonly maxEntries = 128, private readonly maxActive = 4) {}

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = this.now();
    for (const [name, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(name);
      }
    }
    const cached = this.entries.get(key);
    if (cached) {
      return await cached.result as T;
    }
    if (this.active >= this.maxActive) {
      throw new ServiceError(503, '统计查询繁忙，请稍后重试');
    }
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.entries.delete(oldest);
    }
    this.active++;
    // Defer load so the entry exists even if the loader throws immediately.
    const result = Promise.resolve().then(load).catch((err) => {
      this.entries.delete(key);
      throw err;
    }).finally(() => {
      this.active--;
    });
    this.entries.set(key, {expiresAt: now + 60_000, result});
    return await result;
  }
}
