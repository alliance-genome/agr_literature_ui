import {
  getConvertedFilesMap,
  getConvertedFileClasses,
  getConvertedFileEntries,
} from './BiblioFileManagement';

let nextId = 1;
const makeFile = (display_name, file_class, file_extension = 'md') => ({
  referencefile_id: nextId++,
  display_name,
  file_class,
  file_extension,
  referencefile_mods: [],
});

const MAIN_CLASSES = [
  'converted_merged_main',
  'converted_grobid_main',
  'converted_docling_main',
  'converted_marker_main',
];

const SUPPLEMENT_CLASSES = [
  'converted_merged_supplement',
  'converted_grobid_supplement',
  'converted_docling_supplement',
  'converted_marker_supplement',
];

describe('getConvertedFileClasses', () => {
  test('main rows show main converted classes in merged/grobid/docling/marker order', () => {
    expect(getConvertedFileClasses('main')).toEqual(MAIN_CLASSES);
  });

  test('nXML rows show main converted classes (nXML→markdown outputs are converted_merged_main)', () => {
    expect(getConvertedFileClasses('nXML')).toEqual(MAIN_CLASSES);
  });

  test('supplement rows show supplement converted classes', () => {
    expect(getConvertedFileClasses('supplement')).toEqual(SUPPLEMENT_CLASSES);
  });

  test('other file classes show no converted files', () => {
    expect(getConvertedFileClasses('figure')).toEqual([]);
    expect(getConvertedFileClasses('tei')).toEqual([]);
    expect(getConvertedFileClasses(undefined)).toEqual([]);
  });
});

describe('getConvertedFilesMap', () => {
  test('groups converted files under the source display_name by stripping method suffixes', () => {
    const merged = makeFile('PMC123_merged', 'converted_merged_main');
    const grobid = makeFile('PMC123_grobid', 'converted_grobid_main');
    const map = getConvertedFilesMap([
      makeFile('PMC123', 'main', 'pdf'),
      merged,
      grobid,
    ]);
    expect(map).toEqual({
      PMC123: {
        converted_merged_main: merged,
        converted_grobid_main: grobid,
      },
    });
  });

  test('groups _nxml markdown under the nXML source display_name', () => {
    const nxmlMd = makeFile('PMC456_nxml', 'converted_merged_main');
    const map = getConvertedFilesMap([
      makeFile('PMC456', 'nXML', 'xml'),
      nxmlMd,
    ]);
    expect(map).toEqual({
      PMC456: { converted_merged_main: nxmlMd },
    });
  });

  test('ignores non-converted file classes', () => {
    expect(getConvertedFilesMap([makeFile('PMC123', 'main', 'pdf')])).toEqual({});
  });
});

describe('getConvertedFileEntries', () => {
  test('returns ordered labeled entries for a main row', () => {
    const merged = makeFile('PMC123_merged', 'converted_merged_main');
    const grobid = makeFile('PMC123_grobid', 'converted_grobid_main');
    const mainRow = makeFile('PMC123', 'main', 'pdf');
    const map = getConvertedFilesMap([mainRow, merged, grobid]);
    expect(getConvertedFileEntries(mainRow, map)).toEqual([
      { file: merged, label: 'merged' },
      { file: grobid, label: 'grobid' },
    ]);
  });

  test('returns the nXML-derived markdown for an nXML row', () => {
    const nxmlMd = makeFile('PMC456_nxml', 'converted_merged_main');
    const nxmlRow = makeFile('PMC456', 'nXML', 'xml');
    const map = getConvertedFilesMap([nxmlRow, nxmlMd]);
    expect(getConvertedFileEntries(nxmlRow, map)).toEqual([
      { file: nxmlMd, label: 'merged' },
    ]);
  });

  test('does not include raw tei files (tei is no longer displayed)', () => {
    const merged = makeFile('PMC123_merged', 'converted_merged_main');
    const tei = makeFile('PMC123', 'tei', 'tei');
    const mainRow = makeFile('PMC123', 'main', 'pdf');
    const map = getConvertedFilesMap([mainRow, merged, tei]);
    expect(getConvertedFileEntries(mainRow, map)).toEqual([
      { file: merged, label: 'merged' },
    ]);
  });

  test('includes tei-derived markdown (_tei suffix) on the main row', () => {
    const teiMd = makeFile('PMC123_tei', 'converted_merged_main');
    const tei = makeFile('PMC123', 'tei', 'tei');
    const mainRow = makeFile('PMC123', 'main', 'pdf');
    const map = getConvertedFilesMap([mainRow, tei, teiMd]);
    expect(getConvertedFileEntries(mainRow, map)).toEqual([
      { file: teiMd, label: 'merged' },
    ]);
  });

  test('shows _nxml markdown only on the nXML row when main and nXML share a display_name', () => {
    const nxmlMd = makeFile('PMC789_nxml', 'converted_merged_main');
    const mainRow = makeFile('PMC789', 'main', 'pdf');
    const nxmlRow = makeFile('PMC789', 'nXML', 'xml');
    const map = getConvertedFilesMap([mainRow, nxmlRow, nxmlMd]);
    expect(getConvertedFileEntries(nxmlRow, map)).toEqual([
      { file: nxmlMd, label: 'merged' },
    ]);
    expect(getConvertedFileEntries(mainRow, map)).toEqual([]);
  });

  test('does not show non-nXML-derived markdown on the nXML row', () => {
    const teiMd = makeFile('PMC321_tei', 'converted_merged_main');
    const nxmlRow = makeFile('PMC321', 'nXML', 'xml');
    const map = getConvertedFilesMap([nxmlRow, teiMd]);
    expect(getConvertedFileEntries(nxmlRow, map)).toEqual([]);
  });

  test('returns supplement entries for a supplement row', () => {
    const merged = makeFile('supp1_merged', 'converted_merged_supplement');
    const suppRow = makeFile('supp1', 'supplement', 'pdf');
    const map = getConvertedFilesMap([suppRow, merged]);
    expect(getConvertedFileEntries(suppRow, map)).toEqual([
      { file: merged, label: 'merged' },
    ]);
  });

  test('returns no entries for rows with no converted files', () => {
    const figureRow = makeFile('fig1', 'figure', 'jpg');
    expect(getConvertedFileEntries(figureRow, {})).toEqual([]);
  });
});
