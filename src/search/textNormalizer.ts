const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'for', 'of', 'with', 'in', 'on', 'to', 'by', 'or']);

export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function stem(token: string): string {
  if (token.length <= 3 || /\d/.test(token)) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(token)) return token;
  if (/(xes|ches|shes|sses|zes)$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

/**
 * Lowercases, strips diacritics and punctuation, removes stop words and applies light
 * plural stemming. Hyphenated/apostrophised words also emit their joined form so that
 * "t-shirt" and "tshirt" match each other.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  for (const word of input.normalize('NFKD').split(/\s+/)) {
    const parts = normalizeText(word).split(' ').filter(Boolean);
    for (const part of parts) {
      if (!STOP_WORDS.has(part)) tokens.push(stem(part));
    }
    if (parts.length > 1) tokens.push(stem(parts.join('')));
  }
  return tokens;
}
