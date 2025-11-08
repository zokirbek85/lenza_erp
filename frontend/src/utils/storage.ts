export const saveCache = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch (error) {
    console.warn('Failed to save cache', error);
  }
};

export const loadCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).value as T;
  } catch (error) {
    console.warn('Failed to load cache', error);
    return null;
  }
};
