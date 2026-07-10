"use client";

import { TextRange } from "./shared-part-01";

import { normalizeInlineBlankPlaceholders } from "./shared-part-02";



export function parseBraceBoldSegments(text: string) {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("{", cursor);
    if (openIndex === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (openIndex > cursor) {
      segments.push({ text: text.slice(cursor, openIndex), bold: false });
    }

    const closeIndex = text.indexOf("}", openIndex + 1);
    if (closeIndex === -1) {
      segments.push({ text: text.slice(openIndex), bold: false });
      break;
    }

    const boldText = text.slice(openIndex + 1, closeIndex);
    if (boldText) {
      segments.push({ text: boldText, bold: true });
    }
    cursor = closeIndex + 1;
  }

  return segments;
}

export function parseInlineItalicSegments(text: string) {
  const segments: Array<{ text: string; italic: boolean }> = [];
  const tokens = text.split(/(<\/?i>)/i);
  let italic = false;

  tokens.forEach((token) => {
    if (!token) {
      return;
    }
    if (/^<i>$/i.test(token)) {
      italic = true;
      return;
    }
    if (/^<\/i>$/i.test(token)) {
      italic = false;
      return;
    }
    segments.push({ text: token, italic });
  });

  return segments;
}

export function getHighlightNodePlainTextLength(node: Node | undefined): number {
  if (!node) {
    return 0;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }

  if (node.nodeName === "BR") {
    return 1;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return 0;
  }

  let length = 0;
  node.childNodes.forEach((child) => {
    length += getHighlightNodePlainTextLength(child);
  });
  return length;
}

export function getHighlightTextOffset(root: HTMLElement, container: Node, offset: number): number {
  let total = 0;
  let found = false;

  const visit = (node: Node): boolean => {
    if (found) {
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node === container) {
        total += offset;
        found = true;
        return true;
      }

      total += node.textContent?.length ?? 0;
      return false;
    }

    if (node.nodeName === "BR") {
      if (node === container) {
        if (offset > 0) {
          total += 1;
        }
        found = true;
        return true;
      }

      total += 1;
      return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node === container) {
        for (let index = 0; index < offset; index += 1) {
          total += getHighlightNodePlainTextLength(node.childNodes[index] ?? undefined);
        }
        found = true;
        return true;
      }

      for (let index = 0; index < node.childNodes.length; index += 1) {
        if (visit(node.childNodes[index]!)) {
          return true;
        }
      }
    }

    return false;
  };

  visit(root);
  return total;
}

export function getHighlightTextOffsets(blockNode: HTMLElement, range: Range) {
  return {
    start: getHighlightTextOffset(blockNode, range.startContainer, range.startOffset),
    end: getHighlightTextOffset(blockNode, range.endContainer, range.endOffset),
  };
}

export function parseBraceBoldText(text: string) {
  const normalizedText = normalizeInlineBlankPlaceholders(text);
  const boldRanges: TextRange[] = [];
  const italicRanges: TextRange[] = [];
  const bulletLineIndexes = new Set<number>();
  let plainText = "";

  normalizedText.split("\n").forEach((rawLine, lineIndex, lines) => {
    const isBulletLine = /^\s*\*/.test(rawLine);
    const line = rawLine.replace(/^\s*\*\s?/, "");
    if (isBulletLine) {
      bulletLineIndexes.add(lineIndex);
    }

    if (lineIndex > 0) {
      plainText += "\n";
    }

    parseBraceBoldSegments(line).forEach((boldSegment) => {
      parseInlineItalicSegments(boldSegment.text).forEach((italicSegment) => {
        const segmentStart = plainText.length;
        plainText += italicSegment.text;
        const segmentEnd = plainText.length;

        if (segmentEnd <= segmentStart) {
          return;
        }
        if (boldSegment.bold) {
          boldRanges.push({ start: segmentStart, end: segmentEnd });
        }
        if (italicSegment.italic) {
          italicRanges.push({ start: segmentStart, end: segmentEnd });
        }
      });
    });

    if (line.length === 0 && lineIndex < lines.length - 1) {
      plainText += "";
    }
  });

  return { plainText, boldRanges, italicRanges, bulletLineIndexes };
}

export function parseBinaryInstructionLayout(text: string) {
  const lines = text.split("\n");
  const prefixLines: string[] = [];
  const optionRows: Array<{ label: string; detail: string }> = [];
  let sawOptionRow = false;

  for (const line of lines) {
    const match = line.match(/^\{([^}]+)\}(?:\t+|\s{2,})(.+)$/);
    if (match) {
      sawOptionRow = true;
      optionRows.push({
        label: match[1]?.trim() ?? "",
        detail: match[2]?.trim() ?? "",
      });
      continue;
    }

    if (!sawOptionRow) {
      prefixLines.push(line);
    }
  }

  if (optionRows.length < 2) {
    return null;
  }

  return {
    prefix: prefixLines.join("\n").trimEnd(),
    optionRows,
  };
}

export function softenInstructionText(text: string) {
  return text
    .replace(/\bTRUE,\s*FALSE,\s*or\s*NOT GIVEN\b/g, "True, False, or Not Given")
    .replace(/\bYES,\s*NO,\s*or\s*NOT GIVEN\b/g, "Yes, No, or Not Given");
}

export function parseCompletionTableLayout(text: string) {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return null;
  }

  const parsedRows: Array<{ isHeader: boolean; cells: string[] }> = [];

  for (const line of rows) {
    if (!line.includes("|")) {
      const previousRow = parsedRows[parsedRows.length - 1];
      if (!previousRow) {
        return null;
      }

      const continuationTargetIndex = /^\(.*\)$/.test(line)
        ? 0
        : Math.max(0, previousRow.cells.length - 1);
      previousRow.cells[continuationTargetIndex] = previousRow.cells[continuationTargetIndex]
        ? `${previousRow.cells[continuationTargetIndex]}\n${line}`
        : line;
      continue;
    }

    const isHeader = line.startsWith("||") && line.endsWith("||");
    const body = isHeader ? line.slice(2, -2).trim() : line;
    const cells = body.split("|").map((cell) => cell.trim());
    if (cells.length < 2) {
      return null;
    }
    parsedRows.push({ isHeader, cells });
  }

  return parsedRows;
}
