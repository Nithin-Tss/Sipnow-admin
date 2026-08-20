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

/**
 * Tokenizes raw CSV text into rows of fields, RFC-4180 style: quote state is
 * tracked across the whole text so a literal newline inside a quoted field
 * (e.g. a multi-line description) stays part of that field instead of being
 * treated as a row separator.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
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
      row.push(cur.trim());
      cur = "";
    } else if (ch === "\r") {
      // skip; \n (or end of text) terminates the row
    } else if (ch === "\n") {
      row.push(cur.trim());
      cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }
  row.push(cur.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

/** Returns the column headers from the first non-empty row of a CSV file. */
export function parseCsvHeaders(text) {
  const rows = parseCsvRows(text);
  return (rows[0] ?? []).filter(Boolean);
}

/**
 * Parses a CSV file (with a header row) into an array of plain objects,
 * keyed by the lower-cased header names. Handles quoted fields, including
 * ones containing embedded newlines.
 */
export function parseCsvRecords(text) {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cols) => {
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
