import { formatTimestamp, metaLabelFor } from './recordMeta';

describe('formatTimestamp', () => {
  // Every expectation here is timezone-independent by design: the API sends naive
  // timestamps with no offset, so the only correct rendering is the one it sent.
  // Run the suite under TZ=America/Los_Angeles to check -- an implementation that
  // round-trips through Date shifts these by the viewer's offset and fails.
  test('renders a datetime as YYYY-MM-DD HH:MM:SS', () => {
    expect(formatTimestamp('2026-09-22T18:42:55.226785')).toBe('2026-09-22 18:42:55');
  });

  test('renders the same value whatever the viewer timezone', () => {
    // The naive string is what the server recorded. Converting it by the reader's
    // offset invents a different moment -- and rolls the date over near midnight.
    expect(formatTimestamp('2026-09-22T23:30:00')).toBe('2026-09-22 23:30:00');
    expect(formatTimestamp('2026-09-22T00:30:00')).toBe('2026-09-22 00:30:00');
  });

  test('accepts a space separator as well as T', () => {
    expect(formatTimestamp('2026-09-22 18:42:55')).toBe('2026-09-22 18:42:55');
  });

  test('accepts a time without seconds', () => {
    expect(formatTimestamp('2026-09-22T18:42')).toBe('2026-09-22 18:42');
  });

  test('renders a bare date without a time', () => {
    expect(formatTimestamp('2026-09-22')).toBe('2026-09-22');
  });

  test('returns the original string when it is not a date', () => {
    // Better to show a curator something odd than to blank the field silently.
    expect(formatTimestamp('not a date')).toBe('not a date');
  });

  test('renders nothing for empty input', () => {
    expect(formatTimestamp('')).toBe('');
    expect(formatTimestamp(null)).toBe('');
    expect(formatTimestamp(undefined)).toBe('');
  });
});

describe('metaLabelFor', () => {
  const BY = 'AGRKB:103000000000021';
  const WHEN = '2026-09-22T18:42:55.226785';

  test('joins curator and timestamp when both are shown', () => {
    expect(metaLabelFor({ showCurator: true, showTimestamps: true })(BY, WHEN))
      .toBe(`${BY} · 2026-09-22 18:42:55`);
  });

  test('drops the curator when that toggle is off', () => {
    expect(metaLabelFor({ showCurator: false, showTimestamps: true })(BY, WHEN))
      .toBe('2026-09-22 18:42:55');
  });

  test('drops the timestamp when that toggle is off', () => {
    expect(metaLabelFor({ showCurator: true, showTimestamps: false })(BY, WHEN)).toBe(BY);
  });

  test('returns null when both toggles are off, so callers render nothing', () => {
    // null rather than '' because the callers test truthiness to decide whether to
    // render the element at all.
    expect(metaLabelFor({ showCurator: false, showTimestamps: false })(BY, WHEN)).toBe(null);
  });

  test('returns null when the record carries neither value', () => {
    expect(metaLabelFor({ showCurator: true, showTimestamps: true })(null, null)).toBe(null);
  });

  test('shows whichever half the record actually has', () => {
    const label = metaLabelFor({ showCurator: true, showTimestamps: true });
    expect(label(BY, null)).toBe(BY);
    expect(label(null, WHEN)).toBe('2026-09-22 18:42:55');
  });
});
