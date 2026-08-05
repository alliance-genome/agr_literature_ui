import { splitCurie, joinCurie, normalizePrefix, validateCurie } from './xrefCurie';

const known = ['ZFIN', 'Xenbase', 'WB', 'SGD', 'ORCID'];
const regexFor = (p) =>
  ({
    Xenbase: /^Xenbase:XB-PERS-\d+$/,
    WB: /^WB:WBPerson\d+$/,
  }[p] || null);

test('splitCurie splits on the first colon only', () => {
  expect(splitCurie('WB:WBPerson123')).toEqual({ prefix: 'WB', id: 'WBPerson123' });
  expect(splitCurie('DOI:10.1/x:y')).toEqual({ prefix: 'DOI', id: '10.1/x:y' });
  expect(splitCurie('noprefix')).toEqual({ prefix: 'noprefix', id: '' });
});

test('joinCurie trims the id', () => {
  expect(joinCurie('WB', ' WBPerson1 ')).toBe('WB:WBPerson1');
});

test('normalizePrefix is case-insensitive against known keys', () => {
  expect(normalizePrefix('XenBase', known)).toBe('Xenbase');
  expect(normalizePrefix('Xenbase', known)).toBe('Xenbase');
  expect(normalizePrefix('Weird', known)).toBe('Weird'); // unknown left as-is
});

test('validateCurie: matches regex, allows prefixes with no regex', () => {
  expect(validateCurie('Xenbase', 'XB-PERS-123', regexFor)).toBe(true);
  expect(validateCurie('Xenbase', 'XB-PERS-x', regexFor)).toBe(false);
  expect(validateCurie('WB', 'WBPerson9', regexFor)).toBe(true);
  expect(validateCurie('ZFIN', 'anything', regexFor)).toBe(true); // no regex -> allowed
});
