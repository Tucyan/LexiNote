/**
 * Utility for formatting and normalizing English phonetic symbols (IPA).
 * Ensures robust display across Android and iOS platforms.
 */

export function formatPhonetic(raw?: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Strip markdown formatting like **[...]** or *...*
  str = str.replace(/[*_`]/g, '').trim();

  if (!str) return '';

  // If already contains localized pronunciation marks (e.g., 英 /.../ 美 /.../ or UK: /.../ US: /.../)
  if (
    str.includes('英') ||
    str.includes('美') ||
    str.toLowerCase().includes('uk') ||
    str.toLowerCase().includes('us')
  ) {
    return str;
  }

  // If already enclosed in standard IPA slashes or square brackets
  if ((str.startsWith('/') && str.endsWith('/')) || (str.startsWith('[') && str.endsWith(']'))) {
    return str;
  }

  // Clean leading and trailing slashes, then wrap in standard /.../
  const cleaned = str.replace(/^\/+|\/+$/g, '').trim();
  return cleaned ? `/${cleaned}/` : '';
}
