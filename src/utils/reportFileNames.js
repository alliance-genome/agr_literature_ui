// Parsing helpers for the report-log listing (/logs).
//
// The report files under /reports/ are written by a dozen unrelated pipeline
// scripts in agr_literature_service, each with its own filename convention, so
// the MOD may appear as a leading token (zfin_gene_reference_over_cap.log), a
// trailing one (gaf_zfin.log, INTERACTION-MOL_ZFIN.log), a mid-string one
// (export_sgd_new_references.log), or not at all (pdf2md.log). Matching whole
// separator-delimited tokens rather than substrings is what makes all three
// positions fall out for free while keeping 'sgdump' from reading as SGD.

const EXTENSION_RE = /\.(log|txt|tsv|csv|json|out|err)(\.gz)?$/i;

// Normalised token -> { mod, detail }. detail preserves a sub-species token that
// folds into a single UI-level MOD, so XBXL/XBXT stay distinguishable in the grid.
// pubmed_update writes the MOD slot from a Python variable that is None for
// whole-corpus runs, so the literal 'NONE' lands in the filename. It marks an
// absent MOD, not a report of its own, and is dropped so those runs stay in the
// same family as the per-MOD ones.
const ABSENT_MOD_TOKEN = 'NONE';

const MOD_ALIASES = {
  FB: { mod: 'FB' },
  MGI: { mod: 'MGI' },
  RGD: { mod: 'RGD' },
  SGD: { mod: 'SGD' },
  WB: { mod: 'WB' },
  ZFIN: { mod: 'ZFIN' },
  XB: { mod: 'XB' },
  XBXL: { mod: 'XB', detail: 'XBXL' },
  XBXT: { mod: 'XB', detail: 'XBXT' },
  HUMAN: { mod: 'HUMAN' },
  SARSCOV2: { mod: 'SARS-CoV-2' }
};

const stripExtension = (name) => name.replace(EXTENSION_RE, '');

// Collapse SARS-CoV-2 before tokenizing — its internal hyphens are separators
// everywhere else in these filenames, so it would otherwise split into pieces.
const collapseMultiTokenMods = (stem) => stem.replace(/sars[-_]?cov[-_]?2/gi, 'SARSCOV2');

// Same reasoning for an ISO date: pack it so it survives tokenizing as one piece.
const collapseIsoDates = (stem) => stem.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1$2$3');

// A date must sit on its own separator-delimited token, so 'report20260530' is
// not a dated report. Both the packed and ISO spellings are accepted.
const DATE_TOKEN_RE = /(?:^|[_\-.])(\d{8}|\d{4}-\d{2}-\d{2})(?=$|[_\-.])/g;

// Round-trip through Date rather than range-checking the fields, so impossible
// calendar days (20260230) are rejected along with impossible months.
const toIsoDate = (token) => {
  const digits = token.replace(/-/g, '');
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (year < 2000 || year > 2099) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

// Returns the last valid stamp in the name; a few names carry a from/to pair and
// the later one is the one that identifies the run.
const extractDate = (stem) => {
  let date = null;
  let match;
  DATE_TOKEN_RE.lastIndex = 0;
  while ((match = DATE_TOKEN_RE.exec(stem)) !== null) {
    const iso = toIsoDate(match[1]);
    if (iso) date = iso;
  }
  return date;
};

const normalizeToken = (token) => token.replace(/[^a-z0-9]/gi, '').toUpperCase();

// Splits on separators but keeps them, so removing the MOD and date tokens can
// leave the remaining separators as the author wrote them (interaction-mol, not
// interaction_mol).
const splitKeepingSeparators = (stem) => stem.split(/([_\-.]+)/).filter(Boolean);

const isSeparator = (part) => /^[_\-.]+$/.test(part);

const tidySeparators = (stem) => stem
  .replace(/([_\-.])[_\-.]+/g, '$1')
  .replace(/^[_\-.]+/, '')
  .replace(/[_\-.]+$/, '');

export function joinUrl(...parts) {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part, index) => (index === 0 ? String(part).replace(/\/+$/, '')
                                       : String(part).replace(/^\/+|\/+$/g, '')))
    .join('/');
}

export function parseReportFile(record) {
  const name = record.name || '';
  const directory = record.directory || '';
  const stem = collapseIsoDates(collapseMultiTokenMods(stripExtension(name)));

  const date = extractDate(stem);

  // Walk the parts once, dropping the first MOD token and every date token; what
  // is left is the report family.
  const parts = splitKeepingSeparators(stem);
  const kept = [];
  let mod = null;
  let modDetail = null;
  for (const part of parts) {
    if (isSeparator(part)) {
      kept.push(part);
      continue;
    }
    const normalized = normalizeToken(part);
    if (normalized === ABSENT_MOD_TOKEN) continue;
    const alias = MOD_ALIASES[normalized];
    if (alias && mod === null) {
      mod = alias.mod;
      modDetail = alias.detail || null;
      continue;
    }
    if (toIsoDate(part)) continue;
    kept.push(part);
  }

  const derivedFamily = tidySeparators(kept.join('')).toLowerCase();
  const unclassified = derivedFamily === '';
  const reportFamily = record.report_family || (unclassified ? name : derivedFamily);

  const isStale = directory.split('/').some((segment) => /_old$/i.test(segment));

  const url = record.url
    || joinUrl(process.env.REACT_APP_ABC_FILE_BASE_URL, 'reports', record.path);

  return {
    ...record,
    mod: record.mod || mod,
    modDetail,
    date: record.date || date,
    isLatest: (record.date || date) === null,
    reportFamily,
    familyKey: `${directory}/${reportFamily}`,
    isStale,
    unclassified,
    url,
    // A family is the report; a series is that report for one MOD. Each MOD keeps
    // its own current copy and its own history (gaf_zfin.log and gaf_wb.log are
    // both current), so the series is what "latest" is resolved against.
    seriesKey: `${directory}/${reportFamily}::${(record.mod || mod) || 'shared'}`
  };
}

const byModifiedDesc = (a, b) => String(b.modified || '').localeCompare(String(a.modified || ''));
const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

// Groups parsed rows into report families and works out which file is the current
// one. The QC scripts write an undated "latest" file alongside a dated copy, so
// when a family has both, the undated file is the current one; a family that is
// only ever dated uses its newest stamp; one that is never dated (dqm_load,
// data_check — overwritten in place each run) falls back to mtime.
export function deriveFamilies(rows) {
  const families = new Map();

  for (const row of rows) {
    let family = families.get(row.seriesKey);
    if (!family) {
      family = { key: row.seriesKey, familyKey: row.familyKey, mod: row.mod,
                 rows: [], mods: new Set() };
      families.set(row.seriesKey, family);
    }
    family.rows.push(row);
    if (row.mod) family.mods.add(row.mod);
  }

  for (const family of families.values()) {
    const dated = family.rows.filter((row) => row.date);
    const undated = family.rows.filter((row) => !row.date);
    const dates = dated.map((row) => row.date).sort();

    family.versionCount = family.rows.length;
    family.dateMin = dates.length ? dates[0] : null;
    family.dateMax = dates.length ? dates[dates.length - 1] : null;

    if (undated.length && dated.length) {
      family.latest = [...undated].sort(byModifiedDesc)[0];
    } else if (dated.length) {
      family.latest = [...dated].sort(byDateDesc)[0];
    } else {
      family.latest = [...family.rows].sort(byModifiedDesc)[0];
    }

    family.history = [...family.rows].sort((a, b) => byDateDesc(a, b) || byModifiedDesc(a, b));
  }

  return families;
}

// state.isLogged.cognitoMod uses the string 'No' rather than null to mean "this
// account has no MOD". Letting that value reach a row predicate would silently
// match nothing and empty the grid, so it is treated as "do not scope" instead.
export const NO_MOD = 'No';

export const ROOT_DIRECTORY_LABEL = '(root)';

const dateForRange = (row) => row.date || String(row.modified || '').slice(0, 10);

export function filterRows(rows, options = {}) {
  const {
    scope,
    mod,
    includeShared = true,
    hideStale = false,
    directory = '',
    family = '',
    dateRange = ''
  } = options;

  const scopingToMod = scope === 'mod' && mod && mod !== NO_MOD;
  const hasRange = Array.isArray(dateRange) && Boolean(dateRange[0]) && Boolean(dateRange[1]);

  return rows.filter((row) => {
    if (hideStale && row.isStale) return false;

    if (directory) {
      const wanted = directory === ROOT_DIRECTORY_LABEL ? '' : directory;
      if ((row.directory || '') !== wanted) return false;
    }

    if (family && row.reportFamily !== family) return false;

    if (scope === 'shared' && row.mod) return false;

    if (scopingToMod) {
      if (!row.mod) {
        if (!includeShared) return false;
      } else if (row.mod !== mod) {
        return false;
      }
    }

    if (hasRange) {
      const effective = dateForRange(row);
      if (!effective || effective < dateRange[0] || effective > dateRange[1]) return false;
    }

    return true;
  });
}
