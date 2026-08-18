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
