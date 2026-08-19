export function parseCsvLines(text, headerKeywords) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const firstLower = lines[0].toLowerCase();
  const hasHeader = headerKeywords.some((kw) => firstLower.includes(kw));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => line.split(",").map((c) => c.trim()));
}

function splitCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

/** Returns the column headers from the first non-empty line of a CSV file. */
export function parseCsvHeaders(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  return splitCsvLine(firstLine).filter(Boolean);
}

/**
 * Parses a CSV file (with a header row) into an array of plain objects,
 * keyed by the lower-cased header names. Handles quoted fields.
 */
export function parseCsvRecords(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const record = {};
    headers.forEach((header, i) => {
      record[header] = (cols[i] ?? "").trim();
    });
    return record;
  });
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Serializes an array of plain objects to CSV text using the given column keys. */
export function toCsv(rows, columns) {
  const headerLine = columns.map((c) => csvEscape(c)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => csvEscape(row[c])).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

/** Triggers a browser download of the given text as a CSV file. */
export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
