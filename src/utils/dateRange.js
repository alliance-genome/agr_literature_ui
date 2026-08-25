// Date-range helpers shared by the report-log browser.
//
// Lifted verbatim in behaviour from the picker in Reports.js (which stays put —
// it is welded to the workflow-stat redux dicts and feeds four live QC reports).
// Ranges are stored as ['YYYY-MM-DD', 'YYYY-MM-DD'] strings, or '' when unset,
// and converted to Date objects only for the widget.

const DAY_MS = 24 * 60 * 60 * 1000;

const TIMEFRAME_DAYS = { Day: 0, Week: 7, Month: 30, Year: 365 };

const pad = (value) => String(value).padStart(2, '0');

const toDayString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function formatDateRange(dateRange) {
  return [toDayString(dateRange[0]), toDayString(dateRange[1])];
}

// The picker hands back local-midnight Dates; adding the offset back keeps the
// stored day from sliding when the browser is behind UTC.
export function formatToUTCString(dateRange) {
  if (!dateRange || dateRange === '') return '';
  const offsetMs = new Date(dateRange[0]).getTimezoneOffset() * 60000;
  return [
    new Date(Date.parse(dateRange[0]) + offsetMs),
    new Date(Date.parse(dateRange[1]) + offsetMs)
  ];
}

export function fixedTimeframeRange(timeframe, today = new Date()) {
  const days = TIMEFRAME_DAYS[timeframe];
  if (days === undefined) return '';
  return formatDateRange([new Date(today.getTime() - days * DAY_MS), today]);
}
