/**
 * Remy Content Parser
 *
 * Splits a Message.content string into typed segments at render time.
 * Fenced ```wine blocks are parsed into structured wine card data;
 * everything else becomes markdown segments.
 *
 * The useGeminiLive hook is NEVER modified — all transformation happens here.
 */

export interface RemyWineData {
  producer: string;
  name: string;
  vintage?: number;
  region?: string;
  type?: string;
  rating?: number;
  note?: string;
}

export type ContentSegment =
  | { type: 'markdown'; text: string }
  | { type: 'wine-cards'; wines: RemyWineData[] };

const WINE_FENCE_RE = /```wine\s*\n([\s\S]*?)```/g;

export function parseRemyContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(WINE_FENCE_RE)) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    // Text before this fence → markdown segment
    if (matchStart > lastIndex) {
      const text = content.slice(lastIndex, matchStart).trim();
      if (text) segments.push({ type: 'markdown', text });
    }

    // Try parsing the JSON inside the fence
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      const wines: RemyWineData[] = Array.isArray(parsed) ? parsed : [parsed];
      // Validate that each entry has at least producer + name
      const valid = wines.filter(
        (w) => typeof w.producer === 'string' && typeof w.name === 'string'
      );
      if (valid.length > 0) {
        segments.push({ type: 'wine-cards', wines: valid });
      } else {
        // Malformed — fall back to raw code block
        segments.push({ type: 'markdown', text: match[0] });
      }
    } catch {
      // Invalid JSON — fall back to raw code block
      segments.push({ type: 'markdown', text: match[0] });
    }

    lastIndex = matchEnd;
  }

  // Remaining text after the last fence (or entire content if no fences)
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) segments.push({ type: 'markdown', text });
  }

  return segments;
}
