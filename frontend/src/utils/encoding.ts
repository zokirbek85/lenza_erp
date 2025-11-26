const BROKEN_MARKERS = ['вЂ', 'â€™', 'â€œ', 'â€', 'Ã', 'Â', 'Ð', '�'];

export const fixEncoding = <T>(value: T): T => {
  if (typeof value !== 'string') return value;

  const str = value;
  const shouldAttemptFix = BROKEN_MARKERS.some((marker) => str.includes(marker));
  if (!shouldAttemptFix) return value;

  try {
    // Older CP1251/Latin-1 mojibake (e.g. â€” / вЂ”) is reversed by escape/decodeURIComponent.
    const decoded = decodeURIComponent(escape(str));
    return decoded as unknown as T;
  } catch {
    return value;
  }
};

export const displayText = (value: string | null | undefined, placeholder = '—') => {
  if (value === null || value === undefined) return placeholder;
  const normalized = value.trim();
  if (!normalized) return placeholder;
  const fixed = fixEncoding(normalized);
  return (fixed || placeholder) as string;
};
