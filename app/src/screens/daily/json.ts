/** One piece of JSON text, with its colour class: k key, s string, n number, b true, false or null. */
export interface Token {
  t: string;
  c: '' | 'k' | 's' | 'n' | 'b';
}

const RE = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

/** Split JSON text into tokens for syntax colours. The text is never parsed as HTML. */
export function tokens(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  for (const m of text.matchAll(RE)) {
    const at = m.index ?? 0;
    if (at > i) out.push({ t: text.slice(i, at), c: '' });
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push({ t: m[1], c: 'k' });
        out.push({ t: m[2], c: '' });
      } else out.push({ t: m[1], c: 's' });
    } else if (m[3] !== undefined) out.push({ t: m[3], c: 'n' });
    else out.push({ t: m[0], c: 'b' });
    i = at + m[0].length;
  }
  if (i < text.length) out.push({ t: text.slice(i), c: '' });
  return out;
}
