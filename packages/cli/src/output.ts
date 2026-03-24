import chalk from 'chalk';

/** Check if --json flag was passed globally. */
export function isJsonMode(): boolean {
  return process.argv.includes('--json');
}

/**
 * Print an aligned table to stdout.
 * Headers are bolded with chalk; columns are padded to the widest value.
 */
export function printTable(headers: string[], rows: string[][]): void {
  if (isJsonMode()) return; // JSON mode skips table output

  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
    return Math.max(h.length, maxRow);
  });

  const headerLine = headers
    .map((h, i) => chalk.bold(h.padEnd(colWidths[i]!)))
    .join('  ');
  console.log(headerLine);

  const separator = colWidths.map((w) => '-'.repeat(w)).join('  ');
  console.log(chalk.dim(separator));

  for (const row of rows) {
    const line = row.map((cell, i) => (cell ?? '').padEnd(colWidths[i]!)).join('  ');
    console.log(line);
  }
}

/** Pretty-print JSON to stdout. */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Print a green success message. */
export function printSuccess(msg: string): void {
  console.log(chalk.green('\u2713') + ' ' + msg);
}

/** Print a red error message. */
export function printError(msg: string): void {
  console.error(chalk.red('\u2717') + ' ' + msg);
}

/** Extract ID from a record that may have `id` or `_id`. */
export function getId(obj: { _id?: string; id?: string }): string {
  return String(obj._id ?? obj.id ?? '');
}

/** Short ID (first 8 chars). */
export function shortId(obj: { _id?: string; id?: string }): string {
  return getId(obj).slice(0, 8);
}

/**
 * Format a date string (YYYY-MM-DD or ISO) to a human-readable form.
 * Returns '-' for null/undefined/empty values.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
