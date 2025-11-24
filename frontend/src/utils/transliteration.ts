/**
 * Transliteration utility for Cyrillic ↔ Latin conversion
 * Supports bidirectional search (user can type in either script)
 */

// Cyrillic to Latin mapping (lowercase)
const cyrillicToLatin: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
  // Special combinations
  дж: 'd',
};

// Latin to Cyrillic mapping (reverse)
const latinToCyrillic: Record<string, string> = {
  a: 'а',
  b: 'б',
  v: 'в',
  g: 'г',
  d: 'д',
  e: 'е',
  yo: 'ё',
  j: 'ж',
  z: 'з',
  i: 'и',
  y: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  f: 'ф',
  x: 'х',
  ts: 'ц',
  ch: 'ч',
  sh: 'ш',
  shch: 'щ',
  yu: 'ю',
  ya: 'я',
  q: 'қ',
  h: 'ҳ',
};

/**
 * Convert Cyrillic text to Latin
 */
export function cyrillicToLatinTranslit(text: string): string {
  let result = '';
  const lowerText = text.toLowerCase();

  for (let i = 0; i < lowerText.length; i++) {
    // Check for multi-character sequences
    if (i < lowerText.length - 1) {
      const twoChar = lowerText.substring(i, i + 2);
      if (cyrillicToLatin[twoChar]) {
        result += cyrillicToLatin[twoChar];
        i++; // Skip next character
        continue;
      }
    }

    // Single character mapping
    const char = lowerText[i];
    result += cyrillicToLatin[char] || char;
  }

  return result;
}

/**
 * Convert Latin text to Cyrillic
 */
export function latinToCyrillicTranslit(text: string): string {
  let result = '';
  const lowerText = text.toLowerCase();

  for (let i = 0; i < lowerText.length; i++) {
    // Check for multi-character sequences (shch, sh, ch, ts, yo, yu, ya)
    if (i < lowerText.length - 3) {
      const fourChar = lowerText.substring(i, i + 4);
      if (latinToCyrillic[fourChar]) {
        result += latinToCyrillic[fourChar];
        i += 3; // Skip next 3 characters
        continue;
      }
    }
    if (i < lowerText.length - 2) {
      const threeChar = lowerText.substring(i, i + 3);
      if (latinToCyrillic[threeChar]) {
        result += latinToCyrillic[threeChar];
        i += 2; // Skip next 2 characters
        continue;
      }
    }
    if (i < lowerText.length - 1) {
      const twoChar = lowerText.substring(i, i + 2);
      if (latinToCyrillic[twoChar]) {
        result += latinToCyrillic[twoChar];
        i++; // Skip next character
        continue;
      }
    }

    // Single character mapping
    const char = lowerText[i];
    result += latinToCyrillic[char] || char;
  }

  return result;
}

/**
 * Generate all possible transliteration variants for search
 * Returns array with original text + transliterated versions
 */
export function generateSearchVariants(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalized = text.trim().toLowerCase();
  const variants = new Set<string>();
  variants.add(normalized);

  // Add Cyrillic → Latin transliteration
  variants.add(cyrillicToLatinTranslit(normalized));

  // Add Latin → Cyrillic transliteration
  variants.add(latinToCyrillicTranslit(normalized));

  return Array.from(variants);
}

/**
 * Check if text matches search query (with transliteration support)
 */
export function matchesSearch(text: string, searchQuery: string): boolean {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return true;
  }

  const textLower = text.toLowerCase();
  const searchVariants = generateSearchVariants(searchQuery);

  return searchVariants.some((variant) => textLower.includes(variant));
}
