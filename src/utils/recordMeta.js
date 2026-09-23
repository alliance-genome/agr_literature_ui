// The "who / when" line every record-editing screen puts beside a row: who last
// touched it and at what time.
//
// Extracted because these two helpers had been copied byte-identically into
// PersonDisplay, PersonEditor, LaboratoryDisplay and LaboratoryEditor, and the Biblio
// Person screen would have been a fifth. All five now use this one.
//
// `updated_by` is rendered as it arrives -- an AGRKB person curie, not a name. That is
// what the person and laboratory screens show, and looking it up per row would be a
// request per author on a page that already fetches one per linked person.

// An ISO-shaped date, optionally followed by a time, with T or a space between them.
// Anything after the seconds (fractional seconds, an offset) is ignored rather than
// parsed -- the label shows to the second.
const ISO_SHAPED = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?/;

/**
 * A timestamp as YYYY-MM-DD, or YYYY-MM-DD HH:MM:SS when the value carries a time.
 *
 * Reformatted from the string itself rather than round-tripped through Date, because
 * a round trip silently shifts the value by the viewer's timezone. The API sends
 * naive timestamps -- "2026-09-22T18:42:55.226785", no offset -- which JavaScript
 * reads as LOCAL time and toISOString then converts to UTC. In Los Angeles that
 * renders as 2026-09-23 01:42:55: seven hours out, and a day out as well. (Bare dates
 * escaped it only because the spec parses those as UTC.) There is no moment to
 * convert here anyway: the string is what the server recorded, so the only faithful
 * rendering is the one it sent.
 *
 * Anything not ISO-shaped falls back to the old Date-based path, so callers passing
 * some other date format keep the behaviour they had; and anything unparseable comes
 * back as-is, because showing a curator something odd beats blanking the field and
 * leaving them to wonder whether the record has no date at all.
 */
export const formatTimestamp = (s) => {
  if (!s) return '';
  const str = String(s);

  const iso = str.match(ISO_SHAPED);
  if (iso) return iso[2] ? `${iso[1]} ${iso[2]}` : iso[1];

  try {
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return str;
    const hasTime = /T?\d{2}:\d{2}/.test(str);
    if (hasTime) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    return d.toISOString().slice(0, 10);
  } catch {
    return str;
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
