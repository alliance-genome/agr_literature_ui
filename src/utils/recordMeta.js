// The "who / when" line every record-editing screen puts beside a row: who last
// touched it and at what time.
//
// Extracted because these two helpers already existed four times over, byte-identical,
// in PersonDisplay, PersonEditor, LaboratoryDisplay and LaboratoryEditor. The Biblio
// Person screen would have been a fifth copy. Those four still hold their own; this is
// the version new code should use, and the one they can migrate to.
//
// `updated_by` is rendered as it arrives -- an AGRKB person curie, not a name. That is
// what the person and laboratory screens show, and looking it up per row would be a
// request per author on a page that already fetches one per linked person.

/**
 * A timestamp as YYYY-MM-DD, or YYYY-MM-DD HH:MM:SS when the value carries a time.
 * Anything unparseable comes back as-is: showing a curator something odd beats
 * blanking the field and leaving them to wonder whether the record has no date.
 */
export const formatTimestamp = (s) => {
  if (!s) return '';
  try {
    const str = String(s);
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return str;
    const hasTime = /T?\d{2}:\d{2}/.test(str);
    if (hasTime) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    return d.toISOString().slice(0, 10);
  } catch {
    return String(s);
  }
};

/**
 * Build the label function for a page's current toggle state.
 *
 * A factory rather than a four-argument function because every call site on a page
 * shares the same two toggles and differs only in the record -- the same shape the
 * inline `metaLabel` closures had.
 *
 * Returns null, not '', when there is nothing to show: callers test truthiness to
 * decide whether to render the element at all.
 */
export const metaLabelFor = ({ showCurator, showTimestamps } = {}) => (by, date) => {
  const parts = [];
  if (showCurator && by) parts.push(by);
  if (showTimestamps && date) parts.push(formatTimestamp(date));
  return parts.length ? parts.join(' · ') : null;
};
