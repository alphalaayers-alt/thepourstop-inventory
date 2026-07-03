const cache = new Map<string, unknown>();
let hydrated = false;

export function cloudGetItem<T>(key: string): T | null {
  if (!cache.has(key)) return null;
  return cache.get(key) as T;
}

export function cloudSetItem<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function cloudRemoveItem(key: string): void {
  cache.delete(key);
}

export function clearCloudCache(): void {
  cache.clear();
  hydrated = false;
}

export function isCloudHydrated(): boolean {
  return hydrated;
}

export function setCloudHydrated(value: boolean): void {
  hydrated = value;
}
