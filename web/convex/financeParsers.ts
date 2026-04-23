// CSV parsers for Revolut and WIO bank statements. Pure helpers — no
// Convex registrations live here so this file can be imported from both
// V8 and Node runtime modules.
//
// Both parsers normalise to a shared `NormalizedTxn` shape, which the
// import action then bulk-upserts via `internal.financeTransactions._bulkUpsert`.
// Dedupe across re-uploads relies on a deterministic `externalId` derived
// from source-specific stable fields:
//   Revolut: sha256(source|startedTimestamp|completedTimestamp|description|amount|currency|fee)
//            — using BOTH timestamps (which include hh:mm:ss) avoids
//            collapsing two distinct same-day same-merchant same-amount
//            charges into one (seen in practice for tap-to-pay refills).
//   WIO    : "wio_" + sha256(refNumber|date|amount). Ref number is
//            issued by the bank and unique per transaction, so this is
//            the strongest possible key. Falls back to date|desc|amount
//            when ref is missing.

export interface NormalizedTxn {
  externalId: string;
  date: string;            // YYYY-MM-DD
  description: string;
  descriptionRaw?: string;
  merchantRaw?: string;
  amount: number;          // signed; negative = debit
  currency: string;        // 3-letter ISO
  fee?: number;
  direction?: "debit" | "credit";
  source: "revolut" | "wio" | "generic";
}

export interface ParseResult {
  txns: NormalizedTxn[];
  skipped: number;         // rows we couldn't parse (bad date, missing amount, …)
  source: "revolut" | "wio" | "generic";
}

// ── CSV line tokeniser ───────────────────────────────
// Quoted-field aware. Handles "" inside quoted fields as an escaped quote.

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let buf = "";
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          buf += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      out.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  out.push(buf);
  return out.map((s) => s.trim());
}

export function splitCsvRows(text: string): string[] {
  // Strip BOM if present.
  const cleaned = text.replace(/^\uFEFF/, "");
  // Normalize CRLF / CR. Caller should not feed us a file with embedded
  // newlines inside quoted fields — bank exports don't.
  return cleaned
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((row) => row.length > 0);
}

// ── Source detection ─────────────────────────────────

export function detectSource(filename: string, headerRow: string): "revolut" | "wio" | "generic" {
  const f = filename.toLowerCase();
  if (f.includes("revolut")) return "revolut";
  if (f.includes("wio")) return "wio";
  const h = headerRow.toLowerCase();
  if (h.includes("started date") && h.includes("completed date")) return "revolut";
  if (h.includes("ref. number") || h.includes("ref number")) return "wio";
  return "generic";
}

// ── Hash (deterministic) ─────────────────────────────
// Web Crypto sha256, hex output. Async — caller awaits.

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Date helpers ─────────────────────────────────────

/** Accepts ISO-ish dates (`2024-01-15`, `2024-01-15 10:23:45`). Returns YYYY-MM-DD or null. */
export function parseIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Strip time portion if present.
  const datePart = trimmed.split(/[ T]/)[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  // Validate it's a real date.
  const ms = Date.parse(datePart);
  if (Number.isNaN(ms)) return null;
  return datePart;
}

/** WIO uses DD/MM/YYYY. Returns YYYY-MM-DD or null. */
export function parseWioDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, dStr, mStr, yStr] = m;
  const day = Number(dStr), month = Number(mStr), year = Number(yStr);
  if (!day || !month || !year || month > 12 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (Number.isNaN(Date.parse(iso))) return null;
  return iso;
}

// ── Amount helpers ───────────────────────────────────
// Banks vary on thousand separators / decimal commas. We accept both `.`
// and `,` as the decimal separator when it appears unambiguously, and we
// strip thousand separators (`'`, space, `,` when followed by 3 digits).

export function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Detect comma-as-decimal only when there's no `.` AND comma is followed
  // by 1-2 digits at the end.
  let normalized = trimmed.replace(/['\s]/g, "");
  if (!normalized.includes(".") && /,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    // `,` is thousands separator — drop.
    normalized = normalized.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// ── Revolut parser ───────────────────────────────────
// Header: Type,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
// We import only COMPLETED rows.

export async function parseRevolutCsv(text: string, filename: string): Promise<ParseResult> {
  const rows = splitCsvRows(text);
  if (rows.length === 0) return { txns: [], skipped: 0, source: "revolut" };

  const header = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const iType = idx("type");
  const iStarted = idx("started date");
  const iCompleted = idx("completed date");
  const iDesc = idx("description");
  const iAmount = idx("amount");
  const iFee = idx("fee");
  const iCurrency = idx("currency");
  const iState = idx("state");

  if ([iCompleted, iDesc, iAmount, iCurrency].some((i) => i < 0)) {
    return { txns: [], skipped: rows.length - 1, source: "revolut" };
  }

  const txns: NormalizedTxn[] = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cols = parseCsvLine(rows[r]);
    const state = (iState >= 0 ? cols[iState] : "")?.toUpperCase();
    if (state && state !== "COMPLETED") { skipped++; continue; }

    const completedRaw = (cols[iCompleted] || "").trim();
    const startedRaw = iStarted >= 0 ? (cols[iStarted] || "").trim() : "";
    const date = parseIsoDate(completedRaw) ?? parseIsoDate(startedRaw);
    const amount = parseAmount(cols[iAmount]);
    const fee = iFee >= 0 ? parseAmount(cols[iFee]) ?? undefined : undefined;
    const currency = (cols[iCurrency] || "").toUpperCase();
    const description = (cols[iDesc] || "").trim();
    if (!date || amount === null || !currency || !description) { skipped++; continue; }

    // Include the raw started + completed timestamps (which carry hh:mm:ss
    // in Revolut exports) so two real same-day same-merchant same-amount
    // charges don't collapse to one externalId. If only one timestamp is
    // present we still use it — losing one tiebreaker is fine, but never
    // both.
    const idSeed = [
      "revolut",
      startedRaw,
      completedRaw,
      description,
      amount,
      currency,
      fee ?? 0,
    ].join("|");
    const externalId = await sha256Hex(idSeed);

    txns.push({
      externalId,
      date,
      description,
      descriptionRaw: description,
      merchantRaw: description,
      amount,
      currency,
      fee: fee ?? undefined,
      direction: amount < 0 ? "debit" : "credit",
      source: "revolut",
    });
  }
  return { txns, skipped, source: "revolut" };
  // `filename` is currently unused by the parser; kept in the signature so
  // a future bank-specific tweak can branch on it without changing call sites.
  void filename;
}

// ── WIO parser ───────────────────────────────────────
// Header: Account name,Transaction type,Date,Ref. number,Description,Amount,Balance
// Date is DD/MM/YYYY. Ref number is unique per transaction.

export async function parseWioCsv(text: string, filename: string): Promise<ParseResult> {
  const rows = splitCsvRows(text);
  if (rows.length === 0) return { txns: [], skipped: 0, source: "wio" };

  const header = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const iDate = idx("date");
  const iRef = (() => {
    const a = idx("ref. number");
    if (a >= 0) return a;
    return idx("ref number");
  })();
  const iDesc = idx("description");
  const iAmount = idx("amount");
  const iAccount = idx("account name");
  const iType = idx("transaction type");

  if ([iDate, iDesc, iAmount].some((i) => i < 0)) {
    return { txns: [], skipped: rows.length - 1, source: "wio" };
  }

  const txns: NormalizedTxn[] = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cols = parseCsvLine(rows[r]);
    const date = parseWioDate(cols[iDate]);
    const amount = parseAmount(cols[iAmount]);
    const description = (cols[iDesc] || "").trim();
    if (!date || amount === null || !description) { skipped++; continue; }

    const ref = (iRef >= 0 ? (cols[iRef] || "").trim() : "");
    const account = iAccount >= 0 ? (cols[iAccount] || "").trim() : undefined;
    const txnType = iType >= 0 ? (cols[iType] || "").trim() : undefined;
    // WIO offers both AED and USD account types. Sniff the currency from
    // the per-row Account name (e.g. "USD Personal Account", "AED
    // Business"). Default to AED if nothing matches — that's the most
    // common WIO setup. A future generic-mapper UI lets the user override.
    const currency = inferWioCurrency(account);

    const idSeed = ref || `${date}|${description}|${amount}`;
    const externalId = "wio_" + (await sha256Hex(idSeed));

    txns.push({
      externalId,
      date,
      description,
      descriptionRaw: account ? `${description} (${account})` : description,
      merchantRaw: description,
      amount,
      currency,
      direction: amount < 0 ? "debit" : "credit",
      source: "wio",
    });
    void txnType;
  }
  return { txns, skipped, source: "wio" };
  void filename;
}

// Per-row currency inference for WIO. We look for an explicit 3-letter
// ISO code in the account label first (most precise), then fall back to
// AED for personal-account exports that don't include a currency hint.
function inferWioCurrency(account: string | undefined): string {
  if (!account) return "AED";
  const upper = account.toUpperCase();
  // Common WIO export labels include "AED Personal Account", "USD Personal
  // Account", "EUR Business" etc. Match a standalone 3-letter ISO token.
  const m = upper.match(/\b(AED|USD|EUR|GBP|SAR|INR|IDR|JPY|CHF|CAD|AUD|HKD|SGD)\b/);
  if (m) return m[1];
  return "AED";
}

// ── Generic parser ───────────────────────────────────
// Last-resort fallback when the source is "generic". Expects columns
// named "date", "description", "amount", and optionally "currency". Date
// must be YYYY-MM-DD. The MVP never picks "generic" automatically — only
// when the user explicitly picks it from the upload UI.

export async function parseGenericCsv(text: string, filename: string): Promise<ParseResult> {
  const rows = splitCsvRows(text);
  if (rows.length === 0) return { txns: [], skipped: 0, source: "generic" };

  const header = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
  const iDate = header.indexOf("date");
  const iDesc = header.indexOf("description");
  const iAmount = header.indexOf("amount");
  const iCurrency = header.indexOf("currency");
  if ([iDate, iDesc, iAmount].some((i) => i < 0)) {
    return { txns: [], skipped: rows.length - 1, source: "generic" };
  }

  const txns: NormalizedTxn[] = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cols = parseCsvLine(rows[r]);
    const date = parseIsoDate(cols[iDate]);
    const amount = parseAmount(cols[iAmount]);
    const description = (cols[iDesc] || "").trim();
    const currency = ((iCurrency >= 0 ? cols[iCurrency] : "") || "USD").toUpperCase();
    if (!date || amount === null || !description) { skipped++; continue; }

    const externalId = await sha256Hex(["generic", date, description, amount, currency].join("|"));
    txns.push({
      externalId,
      date,
      description,
      amount,
      currency,
      direction: amount < 0 ? "debit" : "credit",
      source: "generic",
    });
  }
  return { txns, skipped, source: "generic" };
  void filename;
}
