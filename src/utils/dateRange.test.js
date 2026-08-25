import {
  formatDateRange, formatToUTCString, fixedTimeframeRange, rangeFromPickerValue
} from './dateRange';

describe('formatDateRange', () => {
  test('renders a Date pair as YYYY-MM-DD strings', () => {
    expect(formatDateRange([new Date(2026, 0, 5), new Date(2026, 11, 31)]))
      .toEqual(['2026-01-05', '2026-12-31']);
  });

  test('zero-pads single-digit months and days', () => {
    expect(formatDateRange([new Date(2026, 8, 9), new Date(2026, 8, 9)]))
      .toEqual(['2026-09-09', '2026-09-09']);
  });
});

describe('formatToUTCString', () => {
  test('returns an empty value untouched so the picker clears', () => {
    expect(formatToUTCString('')).toBe('');
  });

  test('turns stored strings back into Dates on the same calendar day', () => {
    const [start, end] = formatToUTCString(['2026-01-05', '2026-12-31']);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(5);
    expect(end.getDate()).toBe(31);
  });
});

describe('fixedTimeframeRange', () => {
  const today = new Date(2026, 7, 24);

  test('Day is today through today', () => {
    expect(fixedTimeframeRange('Day', today)).toEqual(['2026-08-24', '2026-08-24']);
  });

  test('Week looks back seven days', () => {
    expect(fixedTimeframeRange('Week', today)).toEqual(['2026-08-17', '2026-08-24']);
  });

  test('Month looks back thirty days', () => {
    expect(fixedTimeframeRange('Month', today)).toEqual(['2026-07-25', '2026-08-24']);
  });

  test('Year looks back three hundred and sixty five days', () => {
    expect(fixedTimeframeRange('Year', today)).toEqual(['2025-08-24', '2026-08-24']);
  });

  test('an unknown timeframe clears the range', () => {
    expect(fixedTimeframeRange('Decade', today)).toBe('');
  });
});

describe('rangeFromPickerValue', () => {
  test('stores a picked pair as day strings', () => {
    expect(rangeFromPickerValue([new Date(2026, 5, 1), new Date(2026, 5, 30)]))
      .toEqual(['2026-06-01', '2026-06-30']);
  });

  test('clearing the picker clears the stored range', () => {
    expect(rangeFromPickerValue(null)).toBe('');
  });

  test('an incomplete or unparseable pair leaves the range untouched', () => {
    expect(rangeFromPickerValue([new Date(2026, 5, 1), null])).toBeUndefined();
    expect(rangeFromPickerValue([null, null])).toBeUndefined();
  });
});
