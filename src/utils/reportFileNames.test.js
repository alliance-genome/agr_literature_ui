import { parseReportFile, deriveFamilies, filterRows, joinUrl } from './reportFileNames';

const record = (path, extra = {}) => ({
  path,
  name: path.split('/').pop(),
  directory: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  size: 1024,
  modified: '2026-08-20T00:00:00Z',
  ...extra
});

const modOf = (path) => parseReportFile(record(path)).mod;

describe('parseReportFile - MOD extraction', () => {
  it('reads a MOD from a trailing token', () => {
    expect(modOf('INTERACTION-MOL_ZFIN.log')).toBe('ZFIN');
  });

  it('reads a lowercase MOD from a trailing token', () => {
    expect(modOf('gaf_zfin.log')).toBe('ZFIN');
  });

  it('reads a MOD from a leading token', () => {
    expect(modOf('zfin_gene_reference_over_cap.log')).toBe('ZFIN');
  });

  it('reads a MOD from a mid-string token', () => {
    expect(modOf('export_sgd_new_references.log')).toBe('SGD');
  });

  it('reads a MOD from a dated pipeline log', () => {
    expect(modOf('pubmed_update/update_pubmed_papers_FB_20260530.log')).toBe('FB');
  });

  it('reads a MOD from a directory-scoped latest-only log', () => {
    expect(modOf('dqm_load/FB_dqm_loading.log')).toBe('FB');
  });

  it('returns null when no MOD token is present', () => {
    expect(modOf('pdf2md.log')).toBeNull();
    expect(modOf('dump_prod_database.log')).toBeNull();
    expect(modOf('docker_prune.log')).toBeNull();
    expect(modOf('download_pmc_files.log')).toBeNull();
  });

  it('does not match a MOD embedded inside a longer word', () => {
    expect(modOf('workbench_thing.log')).toBeNull();
    expect(modOf('fbi_report.log')).toBeNull();
    expect(modOf('sgdump.log')).toBeNull();
  });

  it('folds XBXL and XBXT to XB but keeps the detail', () => {
    expect(parseReportFile(record('INTERACTION-MOL_XBXL.log'))).toMatchObject({
      mod: 'XB', modDetail: 'XBXL'
    });
    expect(parseReportFile(record('INTERACTION-MOL_XBXT.log'))).toMatchObject({
      mod: 'XB', modDetail: 'XBXT'
    });
  });

  it('leaves modDetail null when the MOD needs no folding', () => {
    expect(parseReportFile(record('gaf_zfin.log')).modDetail).toBeNull();
  });

  it('survives the hyphens in SARS-CoV-2', () => {
    expect(modOf('INTERACTION-MOL_SARS-CoV-2.log')).toBe('SARS-CoV-2');
  });

  it('reads HUMAN as its own grouping', () => {
    expect(modOf('INTERACTION-GEN_HUMAN.log')).toBe('HUMAN');
  });
});

const dateOf = (path) => parseReportFile(record(path)).date;

describe('parseReportFile - date extraction', () => {
  it('reads a YYYYMMDD stamp from a dated pipeline log', () => {
    expect(dateOf('pubmed_update/update_pubmed_papers_FB_20260530.log')).toBe('2026-05-30');
  });

  it('reads a YYYYMMDD stamp from a dated QC report', () => {
    expect(dateOf('QC/duplicate_orcid_report_20260818.log')).toBe('2026-08-18');
  });

  it('reads an ISO-style stamp', () => {
    expect(dateOf('some_report_2026-05-30.log')).toBe('2026-05-30');
  });

  it('returns null for the undated latest twin', () => {
    expect(dateOf('QC/duplicate_orcid_report.log')).toBeNull();
  });

  it('returns null for a latest-only log', () => {
    expect(dateOf('dqm_load/FB_dqm_loading.log')).toBeNull();
  });

  it('rejects an eight-digit token that is not a valid date', () => {
    expect(dateOf('report_20261345.log')).toBeNull();
    expect(dateOf('report_20260230.log')).toBeNull();
    expect(dateOf('report_20260000.log')).toBeNull();
  });

  it('rejects a year outside the plausible range', () => {
    expect(dateOf('report_18991231.log')).toBeNull();
    expect(dateOf('report_21000101.log')).toBeNull();
  });

  it('does not treat a digit run glued to a word as a date', () => {
    expect(dateOf('report20260530.log')).toBeNull();
  });

  it('takes the last stamp when a name carries several', () => {
    expect(dateOf('diff_20260101_20260530.log')).toBe('2026-05-30');
  });

  it('marks an undated file as the latest and a dated one as not', () => {
    expect(parseReportFile(record('QC/duplicate_orcid_report.log')).isLatest).toBe(true);
    expect(parseReportFile(record('QC/duplicate_orcid_report_20260818.log')).isLatest).toBe(false);
  });
});

describe('parseReportFile - report family', () => {
  const familyOf = (path) => parseReportFile(record(path)).reportFamily;

  it('strips the MOD and the date stamp', () => {
    expect(familyOf('pubmed_update/update_pubmed_papers_FB_20260530.log'))
      .toBe('update_pubmed_papers');
  });

  it('strips a trailing MOD and keeps the original separators', () => {
    expect(familyOf('INTERACTION-MOL_ZFIN.log')).toBe('interaction-mol');
  });

  it('gives every MOD variant of one report the same family', () => {
    expect(familyOf('INTERACTION-MOL_SARS-CoV-2.log')).toBe('interaction-mol');
    expect(familyOf('INTERACTION-MOL_XBXL.log')).toBe('interaction-mol');
  });

  it('strips a leading MOD', () => {
    expect(familyOf('zfin_gene_reference_over_cap.log')).toBe('gene_reference_over_cap');
    expect(familyOf('dqm_load/FB_dqm_loading.log')).toBe('dqm_loading');
  });

  it('strips a mid-string MOD without leaving a doubled separator', () => {
    expect(familyOf('export_sgd_new_references.log')).toBe('export_new_references');
  });

  it('leaves a name with neither MOD nor date untouched', () => {
    expect(familyOf('pdf2md.log')).toBe('pdf2md');
  });

  it('scopes the family key by directory so like-named series stay apart', () => {
    const live = parseReportFile(record('QC/duplicate_orcid_report_20260818.log'));
    const stale = parseReportFile(record('QC_old/duplicate_orcid_report_20260818.log'));
    const root = parseReportFile(record('duplicate_orcid_report_20260818.log'));
    expect(live.familyKey).not.toBe(stale.familyKey);
    expect(live.familyKey).not.toBe(root.familyKey);
  });

  it('gives the undated twin and its dated copies one family key', () => {
    expect(parseReportFile(record('QC/duplicate_orcid_report.log')).familyKey)
      .toBe(parseReportFile(record('QC/duplicate_orcid_report_20260818.log')).familyKey);
  });
});

describe('parseReportFile - staleness and classification', () => {
  it('flags files under an _old directory as stale', () => {
    expect(parseReportFile(record('entity_extraction_old/wb_gene_matches.txt')).isStale).toBe(true);
    expect(parseReportFile(record('entity_extraction/wb_gene_matches.txt')).isStale).toBe(false);
    expect(parseReportFile(record('pdf2md.log')).isStale).toBe(false);
  });

  it('falls back to the raw name when nothing survives parsing', () => {
    const parsed = parseReportFile(record('QC/20260818.log'));
    expect(parsed.unclassified).toBe(true);
    expect(parsed.reportFamily).toBe('20260818.log');
  });

  it('marks an ordinary file as classified', () => {
    expect(parseReportFile(record('pdf2md.log')).unclassified).toBe(false);
  });

  it('never throws on degenerate input', () => {
    expect(() => parseReportFile(record('.log'))).not.toThrow();
    expect(() => parseReportFile({ path: '', name: '', directory: '' })).not.toThrow();
  });
});

describe('parseReportFile - server-supplied fields win', () => {
  it('prefers the server MOD, date, family and url over the heuristic', () => {
    const parsed = parseReportFile(record('gaf_zfin.log', {
      mod: 'WB', date: '2020-01-01', report_family: 'server_family', url: 'https://x/y.log'
    }));
    expect(parsed).toMatchObject({
      mod: 'WB', date: '2020-01-01', reportFamily: 'server_family', url: 'https://x/y.log'
    });
  });
});

describe('deriveFamilies', () => {
  const parseAll = (paths) => paths.map((p) => parseReportFile(record(p)));

  it('picks the undated twin as the latest of a dated series', () => {
    const families = deriveFamilies(parseAll([
      'QC/duplicate_orcid_report_20260718.log',
      'QC/duplicate_orcid_report.log',
      'QC/duplicate_orcid_report_20260818.log'
    ]));
    const family = families.get('QC/duplicate_orcid_report::shared');
    expect(family.latest.name).toBe('duplicate_orcid_report.log');
    expect(family.versionCount).toBe(3);
  });

  it('picks the newest dated file when there is no undated twin', () => {
    const families = deriveFamilies(parseAll([
      'pubmed_update/update_pubmed_papers_FB_20260530.log',
      'pubmed_update/update_pubmed_papers_FB_20260815.log',
      'pubmed_update/update_pubmed_papers_FB_20260627.log'
    ]));
    const family = families.get('pubmed_update/update_pubmed_papers::FB');
    expect(family.latest.name).toBe('update_pubmed_papers_FB_20260815.log');
    expect(family.dateMin).toBe('2026-05-30');
    expect(family.dateMax).toBe('2026-08-15');
  });

  it('falls back to the most recently modified file when nothing is dated', () => {
    const families = deriveFamilies([
      parseReportFile(record('dqm_load/WB_dqm_loading.log', { modified: '2026-01-01T00:00:00Z' })),
      parseReportFile(record('dqm_load/WB_dqm_loading.log.gz', { modified: '2026-08-01T00:00:00Z' }))
    ]);
    const family = [...families.values()][0];
    expect(family.latest.name).toBe('WB_dqm_loading.log.gz');
    expect(family.dateMin).toBeNull();
    expect(family.dateMax).toBeNull();
  });

  it('keeps a stale _old series separate from the live one', () => {
    const families = deriveFamilies(parseAll([
      'entity_extraction/wb_gene_matches.txt',
      'entity_extraction_old/wb_gene_matches.txt'
    ]));
    expect(families.size).toBe(2);
  });

  it('splits one report name into a series per contributing MOD', () => {
    const families = deriveFamilies(parseAll([
      'dqm_load/FB_dqm_loading.log',
      'dqm_load/WB_dqm_loading.log',
      'dqm_load/ZFIN_dqm_loading.log'
    ]));
    expect(families.size).toBe(3);
    expect([...families.values()].map((f) => f.mod).sort()).toEqual(['FB', 'WB', 'ZFIN']);
    expect([...families.values()].every((f) => f.familyKey === 'dqm_load/dqm_loading')).toBe(true);
  });

  it('returns an empty map for no rows', () => {
    expect(deriveFamilies([]).size).toBe(0);
  });
});

describe('filterRows', () => {
  const rows = [
    parseReportFile(record('gaf_zfin.log')),
    parseReportFile(record('gaf_wb.log')),
    parseReportFile(record('pdf2md.log')),
    parseReportFile(record('QC/duplicate_orcid_report_20260118.log')),
    parseReportFile(record('QC/duplicate_orcid_report_20260818.log')),
    parseReportFile(record('QC_old/duplicate_orcid_report_20250818.log'))
  ];
  const namesOf = (result) => result.map((r) => r.name).sort();

  it('returns every row when given no options', () => {
    expect(filterRows(rows, {})).toHaveLength(rows.length);
  });

  it('scopes to one MOD, keeping shared files by default', () => {
    const result = filterRows(rows, { scope: 'mod', mod: 'ZFIN', includeShared: true });
    expect(namesOf(result)).toContain('gaf_zfin.log');
    expect(namesOf(result)).toContain('pdf2md.log');
    expect(namesOf(result)).not.toContain('gaf_wb.log');
  });

  it('drops shared files when the curator asks for their MOD alone', () => {
    const result = filterRows(rows, { scope: 'mod', mod: 'ZFIN', includeShared: false });
    expect(namesOf(result)).toEqual(['gaf_zfin.log']);
  });

  it('keeps only shared files under the shared scope', () => {
    const result = filterRows(rows, { scope: 'shared' });
    expect(result.every((r) => r.mod === null)).toBe(true);
    expect(namesOf(result)).toContain('pdf2md.log');
  });

  it('never filters when the user has no MOD assigned', () => {
    expect(filterRows(rows, { scope: 'mod', mod: 'No' })).toHaveLength(rows.length);
    expect(filterRows(rows, { scope: 'mod', mod: null })).toHaveLength(rows.length);
    expect(filterRows(rows, { scope: 'mod', mod: '' })).toHaveLength(rows.length);
  });

  it('hides stale _old rows on request', () => {
    expect(filterRows(rows, { hideStale: true }).every((r) => !r.isStale)).toBe(true);
    expect(filterRows(rows, { hideStale: false })).toHaveLength(rows.length);
  });

  it('scopes to one directory', () => {
    const result = filterRows(rows, { directory: 'QC' });
    expect(result.every((r) => r.directory === 'QC')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('scopes to the root directory', () => {
    const result = filterRows(rows, { directory: '(root)' });
    expect(result.every((r) => r.directory === '')).toBe(true);
  });

  it('filters a dated series by date range', () => {
    const result = filterRows(rows, { dateRange: ['2026-06-01', '2026-12-31'] });
    expect(namesOf(result)).toContain('duplicate_orcid_report_20260818.log');
    expect(namesOf(result)).not.toContain('duplicate_orcid_report_20260118.log');
  });

  it('falls back to mtime for undated files in a date range', () => {
    const undated = parseReportFile(record('pdf2md.log', { modified: '2026-08-20T00:00:00Z' }));
    expect(filterRows([undated], { dateRange: ['2026-08-01', '2026-08-31'] })).toHaveLength(1);
    expect(filterRows([undated], { dateRange: ['2026-01-01', '2026-01-31'] })).toHaveLength(0);
  });

  it('ignores an incomplete date range', () => {
    expect(filterRows(rows, { dateRange: '' })).toHaveLength(rows.length);
    expect(filterRows(rows, { dateRange: ['2026-06-01', ''] })).toHaveLength(rows.length);
  });
});

describe('joinUrl', () => {
  it('collapses the trailing slash the env var carries', () => {
    expect(joinUrl('https://dev.alliancegenome.org/', 'reports', 'QC/x.log'))
      .toBe('https://dev.alliancegenome.org/reports/QC/x.log');
  });

  it('joins cleanly when the base has no trailing slash', () => {
    expect(joinUrl('https://dev.alliancegenome.org', 'reports', 'x.log'))
      .toBe('https://dev.alliancegenome.org/reports/x.log');
  });

  it('collapses slashes on the joined parts too', () => {
    expect(joinUrl('https://x.org/', '/reports/', '/QC/x.log'))
      .toBe('https://x.org/reports/QC/x.log');
  });

  it('skips empty parts instead of leaving a doubled slash', () => {
    expect(joinUrl('https://x.org', '', 'x.log')).toBe('https://x.org/x.log');
    expect(joinUrl('https://x.org', undefined, 'x.log')).toBe('https://x.org/x.log');
  });
});

describe('parseReportFile - url', () => {
  const OLD_BASE = process.env.REACT_APP_ABC_FILE_BASE_URL;
  afterAll(() => { process.env.REACT_APP_ABC_FILE_BASE_URL = OLD_BASE; });

  it('builds a single-slash raw url from the trailing-slash env var', () => {
    process.env.REACT_APP_ABC_FILE_BASE_URL = 'https://dev.alliancegenome.org/';
    expect(parseReportFile(record('QC/duplicate_orcid_report.log')).url)
      .toBe('https://dev.alliancegenome.org/reports/QC/duplicate_orcid_report.log');
  });
});

describe('parseReportFile - pipelines that stamp an absent MOD', () => {
  it('treats a literal NONE token as no MOD', () => {
    expect(parseReportFile(record('pubmed_update/update_pubmed_papers_NONE_20260822.log')).mod)
      .toBeNull();
  });

  it('keeps a NONE run in the same family as the real MOD runs', () => {
    const none = parseReportFile(record('pubmed_update/update_pubmed_papers_NONE_20260822.log'));
    const fb = parseReportFile(record('pubmed_update/update_pubmed_papers_FB_20260815.log'));
    expect(none.reportFamily).toBe('update_pubmed_papers');
    expect(none.familyKey).toBe(fb.familyKey);
  });

  it('keeps an empty MOD slot in the same family too', () => {
    const blank = parseReportFile(record('pubmed_update/update_pubmed_papers__20260817.log'));
    expect(blank.mod).toBeNull();
    expect(blank.reportFamily).toBe('update_pubmed_papers');
  });
});

describe('deriveFamilies - one series per MOD', () => {
  const parseAll = (paths) => paths.map((p) => parseReportFile(record(p)));

  it('keeps each MOD current copy of a shared report name separate', () => {
    const families = deriveFamilies(parseAll(['gaf_zfin.log', 'gaf_wb.log']));
    expect(families.size).toBe(2);
    const latestNames = [...families.values()].map((f) => f.latest.name).sort();
    expect(latestNames).toEqual(['gaf_wb.log', 'gaf_zfin.log']);
  });

  it('gives each MOD its own history of a dated per-MOD report', () => {
    const families = deriveFamilies(parseAll([
      'pubmed_update/update_pubmed_papers_FB_20260530.log',
      'pubmed_update/update_pubmed_papers_FB_20260815.log',
      'pubmed_update/update_pubmed_papers_ZFIN_20260815.log'
    ]));
    expect(families.size).toBe(2);
    const fb = [...families.values()].find((f) => f.mod === 'FB');
    expect(fb.versionCount).toBe(2);
    expect(fb.latest.name).toBe('update_pubmed_papers_FB_20260815.log');
  });

  it('still groups a MOD-less report into a single series', () => {
    const families = deriveFamilies(parseAll([
      'QC/duplicate_orcid_report.log',
      'QC/duplicate_orcid_report_20260818.log'
    ]));
    expect(families.size).toBe(1);
    expect([...families.values()][0].mod).toBeNull();
  });
});

describe('filterRows - report family', () => {
  const rows = [
    parseReportFile(record('QC/duplicate_orcid_report_20260818.log')),
    parseReportFile(record('QC/obsolete_pmid_report_20260819.log')),
    parseReportFile(record('gaf_zfin.log'))
  ];

  it('scopes to a single report family', () => {
    const result = filterRows(rows, { family: 'duplicate_orcid_report' });
    expect(result.map((r) => r.name)).toEqual(['duplicate_orcid_report_20260818.log']);
  });

  it('ignores an empty family', () => {
    expect(filterRows(rows, { family: '' })).toHaveLength(3);
  });

  it('returns nothing for a family that does not exist', () => {
    expect(filterRows(rows, { family: 'nope' })).toHaveLength(0);
  });
});
