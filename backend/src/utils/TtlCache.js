export class TtlCache {
  constructor(ttlMs, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.prune();
      if (this.store.size >= this.maxEntries) {
        this.store.delete(this.store.keys().next().value);
      }
    }
    const entry = { value, cachedAt: Date.now(), expiresAt: Date.now() + this.ttlMs };
    this.store.set(key, entry);
    return entry;
  }

  prune() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }
}
