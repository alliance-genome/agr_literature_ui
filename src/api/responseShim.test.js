import { isSuccess, extractCreatedId } from './responseShim';

describe('isSuccess', () => {
  test.each([200, 201, 202, 204, 299])('accepts %i as success', (s) => {
    expect(isSuccess(s)).toBe(true);
  });

  test.each([100, 199, 300, 400, 404, 500])('rejects %i', (s) => {
    expect(isSuccess(s)).toBe(false);
  });

  test('rejects non-numbers', () => {
    expect(isSuccess('200')).toBe(false);
    expect(isSuccess(null)).toBe(false);
    expect(isSuccess(undefined)).toBe(false);
  });
});

describe('extractCreatedId', () => {
  test('returns null for null/undefined', () => {
    expect(extractCreatedId(null)).toBeNull();
    expect(extractCreatedId(undefined)).toBeNull();
  });

  // New strict-REST full-object shape (response_model=...SchemaShow)
  test('reads the expectedField from an object', () => {
    expect(extractCreatedId({ cross_reference_id: 42 }, 'cross_reference_id')).toBe(42);
  });

  test('falls back to curie when expectedField is missing on the object', () => {
    expect(extractCreatedId({ curie: 'AGRKB:101' }, 'reference_id')).toBe('AGRKB:101');
  });

  test('falls back to id when no expectedField and no curie', () => {
    expect(extractCreatedId({ id: 7 })).toBe(7);
  });

  test('returns null when an object has no recognized id-bearing fields', () => {
    expect(extractCreatedId({ unrelated: 'foo' })).toBeNull();
  });

  test('prefers expectedField over curie/id when both are present', () => {
    expect(extractCreatedId(
      { cross_reference_id: 42, curie: 'X:1', id: 99 },
      'cross_reference_id'
    )).toBe(42);
  });

  // Legacy bare-value shapes
  test('strips surrounding double-quotes from a bare curie string', () => {
    expect(extractCreatedId('"AGRKB:101000000000001"')).toBe('AGRKB:101000000000001');
  });

  test('returns an unquoted curie string unchanged', () => {
    expect(extractCreatedId('AGRKB:101')).toBe('AGRKB:101');
  });

  test('returns a bare number as-is', () => {
    expect(extractCreatedId(123)).toBe(123);
  });

  test('parses a numeric string as an int (matches legacy parseInt path)', () => {
    expect(extractCreatedId('42')).toBe(42);
    expect(extractCreatedId('"42"')).toBe(42);
  });
});
