"use client";

import { renderBraceBoldText } from "./shared-part-07";



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

export type CompletionTableRow = {
  isHeader: boolean;
  cells: Array<{
    text: string;
    rowSpan: number;
    colSpan: number;
  }>;
};

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

export function stripHtmlToText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|th|td|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\u00a0/g, " ")
    .trim();
}

export function parseTableSpanAttr(value: string, attrName: "rowspan" | "colspan") {
  const match = value.match(new RegExp(`${attrName}\\s*=\\s*["']?(\\d+)["']?`, "i"));
  const parsed = match ? Number.parseInt(match[1] ?? "", 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizePipeCompletionTableRows(rows: CompletionTableRow[]) {
  if (rows.length === 0) {
    return null;
  }

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  if (maxColumns < 2) {
    return null;
  }

  return rows.map((row) => ({
    ...row,
    cells: row.cells.length < maxColumns
      ? [...row.cells, ...Array.from({ length: maxColumns - row.cells.length }, () => ({
        text: "",
        rowSpan: 1,
        colSpan: 1,
      }))]
      : row.cells,
  }));
}

export function parseCompletionTableHtmlLayout(text: string) {
  const tableMatch = text.match(/<table\b[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    return null;
  }

  const rowMatches = [...tableMatch[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length === 0) {
    return null;
  }

  const rows = rowMatches
    .map((rowMatch, rowIndex) => {
      const cellMatches = [...rowMatch[1].matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)<\/t[hd]>/gi)];
      if (cellMatches.length === 0) {
        return null;
      }

      return {
        isHeader: cellMatches.some((cellMatch) => cellMatch[1].toLowerCase() === "th") || rowIndex === 0,
        cells: cellMatches.map((cellMatch) => ({
          text: stripHtmlToText(cellMatch[3]),
          rowSpan: parseTableSpanAttr(cellMatch[2] ?? "", "rowspan"),
          colSpan: parseTableSpanAttr(cellMatch[2] ?? "", "colspan"),
        })),
      } satisfies CompletionTableRow;
    })
    .filter((row): row is CompletionTableRow => Boolean(row));

  return rows.length > 0 ? rows : null;
}

export function parseCompletionTableLayout(text: string) {
  const htmlLayout = parseCompletionTableHtmlLayout(text);
  if (htmlLayout) {
    return htmlLayout;
  }

  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return null;
  }

  const parsedRows: CompletionTableRow[] = [];
  let maxColumns = 0;

  for (const line of rows) {
    if (!line.includes("|")) {
      const previousRow = parsedRows[parsedRows.length - 1];
      if (!previousRow) {
        continue;
      }

      const continuationTargetIndex = /^\(.*\)$/.test(line)
        ? 0
        : Math.max(0, previousRow.cells.length - 1);
      const currentCell = previousRow.cells[continuationTargetIndex];
      previousRow.cells[continuationTargetIndex] = currentCell
        ? {
            ...currentCell,
            text: currentCell.text ? `${currentCell.text}\n${line}` : line,
          }
        : {
            text: line,
            rowSpan: 1,
            colSpan: 1,
          };
      continue;
    }

    const isHeader = line.startsWith("||") && line.endsWith("||");
    const body = isHeader
      ? line.slice(2, -2).trim()
      : line.replace(/^\|/, "").replace(/\|$/, "").trim();
    const cells = body.split("|").map((cell) => ({
      text: cell.trim(),
      rowSpan: 1,
      colSpan: 1,
    }));
    if (cells.length === 0) {
      continue;
    }
    parsedRows.push({ isHeader, cells });
    maxColumns = Math.max(maxColumns, cells.length);
  }

  if (parsedRows.length === 0) {
    return null;
  }

  if (maxColumns < 2) {
    return null;
  }

  return normalizePipeCompletionTableRows(parsedRows);
}

export function renderInstructionPreviewText(text: string, keyPrefix: string) {
  const binaryLayout = parseBinaryInstructionLayout(text);
  if (!binaryLayout) {
    return <>{renderBraceBoldText(text, keyPrefix)}</>;
  }

  return (
    <div className="space-y-2">
      {binaryLayout.prefix ? (
        <div className="whitespace-pre-wrap">{renderBraceBoldText(binaryLayout.prefix, `${keyPrefix}-prefix`)}</div>
      ) : null}
      <div className="grid gap-y-1">
        {binaryLayout.optionRows.map((row, index) => (
          <div key={`${keyPrefix}-row-${row.label}-${index}`} className="grid grid-cols-[5.5rem_1fr] items-start gap-x-1">
            <strong className="font-bold text-foreground">{row.label}</strong>
            <span>{row.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
