export interface GapFillToken {
  kind: "text" | "gap";
  value: string;
}

export function parseGapFillMarkers(text: string): GapFillToken[] {
  const regex = /\{\{(\d+)\}\}/g;
  const tokens: GapFillToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }

    tokens.push({ kind: "gap", value: match[1] });
    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}
