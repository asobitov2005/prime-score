import type { SpeakingDiarizedTranscriptItem, SpeakingSessionResult } from "@/lib/api/client";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const TOP_Y = 794;
const LINE_HEIGHT = 16;
const LINES_PER_PAGE = 45;
const BODY_CHARS_PER_LINE = 80;

function toPdfAscii(value: string): string {
  return value
    .replace(/[‘’‚‛′ʼʻ]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

function escapePdfText(value: string): string {
  return toPdfAscii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars: number): string[] {
  const words = toPdfAscii(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function fallbackTranscript(result: SpeakingSessionResult): SpeakingDiarizedTranscriptItem[] {
  const items: SpeakingDiarizedTranscriptItem[] = [];
  if (result.examinerTranscript.trim()) {
    items.push({ role: "examiner", text: result.examinerTranscript.trim(), at: null, offsetMs: null });
  }
  if (result.candidateTranscript.trim()) {
    items.push({ role: "candidate", text: result.candidateTranscript.trim(), at: null, offsetMs: null });
  }
  if (!items.length && result.transcript.trim()) {
    items.push({ role: "candidate", text: result.transcript.trim(), at: null, offsetMs: null });
  }
  return items;
}

function buildPageContent(lines: string[], pageNumber: number, pageCount: number): string {
  const content: string[] = [
    "BT",
    "/F1 18 Tf",
    `${MARGIN_X} ${TOP_Y} Td`,
    `(${escapePdfText("PrimeScore Speaking Transcript")}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    `(${escapePdfText(`Page ${pageNumber} of ${pageCount}`)}) Tj`,
    "/F1 11 Tf",
    "0 -28 Td",
  ];

  lines.forEach((line, index) => {
    if (index > 0) {
      content.push(`0 -${LINE_HEIGHT} Td`);
    }
    content.push(`(${escapePdfText(line)}) Tj`);
  });

  content.push("ET");
  return `${content.join("\n")}\n`;
}

function buildPdfDocument(pageLines: string[][]): Uint8Array {
  const pageCount = pageLines.length;
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pageLines.forEach((lines, index) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    contentObjectNumbers.push(contentObjectNumber);
    objects.push("");
    objects.push(buildPageContent(lines, index + 1, pageCount));
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  pageObjectNumbers.forEach((pageObjectNumber, index) => {
    objects[pageObjectNumber - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumbers[index]} 0 R >>`;
  });

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;
  const append = (value: string) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    offset += bytes.length;
  };

  append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const contentObjectNumberSet = new Set(contentObjectNumbers);
  objects.forEach((object, index) => {
    offsets[index + 1] = offset;
    if (contentObjectNumberSet.has(index + 1)) {
      const streamBytes = encoder.encode(object);
      append(`${index + 1} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
      chunks.push(streamBytes);
      offset += streamBytes.length;
      append("\nendstream\nendobj\n");
    } else {
      append(`${index + 1} 0 obj\n${object}\nendobj\n`);
    }
  });

  const xrefOffset = offset;
  append(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) {
    append(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const document = new Uint8Array(offset);
  let cursor = 0;
  chunks.forEach((chunk) => {
    document.set(chunk, cursor);
    cursor += chunk.length;
  });
  return document;
}

function createFilename(result: SpeakingSessionResult): string {
  const slug = result.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "speaking"}-transcript.pdf`;
}

export function downloadSpeakingTranscriptPdf(result: SpeakingSessionResult): void {
  if (typeof window === "undefined") {
    return;
  }

  const transcript = result.diarizedTranscript.length ? result.diarizedTranscript : fallbackTranscript(result);
  const lines: string[] = [
    `Test: ${result.title || "Speaking session"}`,
    `Session: ${result.sessionId}`,
    "",
  ];

  if (transcript.length) {
    transcript.forEach((item) => {
      const speaker = item.role.toLowerCase() === "candidate" || item.role.toLowerCase() === "user" ? "Candidate" : "Examiner";
      const textLines = wrapText(item.text, BODY_CHARS_PER_LINE);
      lines.push(`${speaker}: ${textLines[0]}`);
      textLines.slice(1).forEach((line) => lines.push(`          ${line}`));
      lines.push("");
    });
  } else {
    lines.push("No transcript was saved for this session.");
  }

  const pageLines: string[][] = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pageLines.push(lines.slice(index, index + LINES_PER_PAGE));
  }
  if (!pageLines.length) {
    pageLines.push(["No transcript was saved for this session."]);
  }

  const pdfBytes = buildPdfDocument(pageLines);
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = createFilename(result);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
