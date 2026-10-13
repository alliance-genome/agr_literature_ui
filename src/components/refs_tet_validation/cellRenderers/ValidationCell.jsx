import React from 'react';
import { useSelector } from 'react-redux';
import CellValidationStrip from './CellValidationStrip';
import {
  VALIDATION_STATE_LABELS,
  isAssessedByMod,
  isCuratorValidationTet,
  modFromSourceLabel,
  modOfTet,
} from '../helpers/groupTets';
import { speciesBadgeLetter, speciesName } from '../helpers/speciesUtils';

/** TETs from this cell that are *topic-level* and authored by a professional
 *  biocurator (i.e. count as a curator validation). */
function professionalBiocuratorTopicTets(tets) {
  const arr = Array.isArray(tets) ? tets : (tets?.tets || []);
  return arr.filter(isCuratorValidationTet);
}

/** Derive the validation summary for a cell from its raw tets (the fallback
 *  path used when the batch endpoint did not aggregate validation server-side).
 *  Returns null when the cell has no curator validation.
 *
 *  Shape mirrors the server `validation` aggregate so the renderer is agnostic
 *  to where the summary came from:
 *    { positives, negatives, byCurator: [{ name, negated,
 *        sources: [{ method, label }], species: [curie], mods: [MOD] }] } */
function deriveValidationSummary(tets) {
  const validations = professionalBiocuratorTopicTets(tets);
  if (validations.length === 0) return null;
  const positives = validations.filter((t) => !t.negated).length;
  const negatives = validations.filter((t) => t.negated).length;

  // Group validations by (curator, polarity) and collect the source methods
  // each (curator, polarity) combination used. If Curator A submitted both
  // a positive and a negative tag they appear on both rows; multiple
  // positives from the same curator collapse into one row but the source
  // icons accumulate. We never drop a name even if created_by is missing —
  // render as "(unknown curator)" instead, so every validation TET is
  // accounted for.
  const groups = new Map();
  for (const t of validations) {
    const name = t.created_by || '(unknown curator)';
    const negated = !!t.negated;
    const key = `${name}|${negated ? 'N' : 'Y'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name,
        negated,
        sources: new Map(),
        species: new Set(),
        mods: new Set(),
      });
    }
    const src = t.tag_source?.source_method;
    if (src) {
      // Keep a Map source_method → label so the tooltip shows the full
      // source label (method / data-provider) while the icon shows just
      // the first letter.
      const lab = `${src}${
        t.tag_source?.secondary_data_provider_abbreviation
          ? ` / ${t.tag_source.secondary_data_provider_abbreviation}`
          : ''
      }`;
      groups.get(key).sources.set(src, lab);
    }
    if (t.species) groups.get(key).species.add(t.species);
    const mod = modOfTet(t);
    if (mod) groups.get(key).mods.add(mod);
  }
  const byCurator = [...groups.values()].map((g) => ({
    name: g.name,
    negated: g.negated,
    sources: [...g.sources.entries()].map(([method, label]) => ({
      method,
      label,
    })),
    species: [...g.species],
    mods: [...g.mods],
  }));
  return { positives, negatives, byCurator };
}

/** Normalize the server `validation` aggregate into the renderer's summary
 *  shape. Returns null when the server reports no curator validation. The
 *  server groups carry no MOD field, so each group's MODs are read from its
 *  source labels (`method / MOD`). */
function serverValidationSummary(cell) {
  if (!cell) return null;
  return {
    positives: cell.positives || 0,
    negatives: cell.negatives || 0,
    byCurator: (cell.by_curator || []).map((g) => {
      const sources = Array.isArray(g.sources) ? g.sources : [];
      return {
        name: g.name || '(unknown curator)',
        negated: !!g.negated,
        sources,
        species: Array.isArray(g.species) ? g.species : [],
        mods: [
          ...new Set(sources.map((s) => modFromSourceLabel(s?.label)).filter(Boolean)),
        ],
      };
    }),
  };
}

/** Sorted MODs that submitted assessments of one polarity. */
function modsFor(byCurator, negated) {
  const mods = new Set();
  for (const g of byCurator) {
    if (g.negated === negated) g.mods.forEach((m) => mods.add(m));
  }
  return [...mods].sort();
}

/** Comma-separated MOD list with the curator's own MOD in bold. */
function ModList({ mods, ownMod }) {
  return mods.map((m, i) => (
    <React.Fragment key={m}>
      {i > 0 && ', '}
      {m === ownMod ? <strong>{m}</strong> : m}
    </React.Fragment>
  ));
}

export default function ValidationCell(params) {
  const tets = Array.isArray(params.value)
    ? params.value
    : (params.value?.tets || []);
  const {
    topicCurie,
    topicName,
    onValidated,
    curationStatusOptions,
    curationTagOptions,
  } = params.colDef.cellRendererParams || {};
  const referenceCurie = params.data?.curie;
  const curieToNameTaxon = useSelector(
    (s) => s.biblio.curieToNameTaxon
  );
  const cognitoMod = useSelector((s) => s.isLogged?.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged?.testerMod);
  const accessLevelMod =
    testerMod && testerMod !== 'No' ? testerMod : cognitoMod;
  const ownMod = accessLevelMod ? String(accessLevelMod).toUpperCase() : null;

  // Prefer the server-aggregated validation cell when present so this column
  // renders without re-deriving from raw tags. `undefined` => the row was not
  // server-aggregated (older backend / per-ref fallback), derive from tets;
  // `null` => the server aggregated the row and found no curator validation.
  const serverCell = Array.isArray(params.value)
    ? undefined
    : params.value?.validation;
  const summary =
    serverCell !== undefined
      ? serverValidationSummary(serverCell)
      : deriveValidationSummary(tets);

  const strip = (
    <CellValidationStrip
      referenceCurie={referenceCurie}
      topicCurie={topicCurie}
      topicName={topicName}
      cellTets={tets}
      onValidated={onValidated}
      curationStatusOptions={curationStatusOptions}
      curationTagOptions={curationTagOptions}
    />
  );

  if (summary) {
    const { positives, negatives, byCurator } = summary;

    const firstWord = (s) => String(s || '').split(/[_\s/]/)[0];
    const SourceIcons = ({ sources }) => (
      <>
        {sources.map((s) => (
          <span
            className="tetv-source-icon"
            key={s.method}
            title={`source: ${s.label}`}
            aria-label={`source: ${s.label}`}
          >
            {firstWord(s.method) || '?'}
          </span>
        ))}
      </>
    );
    const SpeciesBadges = ({ taxonCuries }) => (
      <>
        {taxonCuries.map((curie) => {
          const name = speciesName(curieToNameTaxon, curie);
          return (
            <span
              className="tetv-species-icon"
              key={curie}
              title={`species: ${name}`}
              aria-label={`species: ${name}`}
            >
              {speciesBadgeLetter(curieToNameTaxon, curie)}
            </span>
          );
        })}
      </>
    );

    // Assessments are per MOD (SCRUM-6256): one pill per polarity, each listing
    // the MODs behind it, so Y from one MOD and N from another both show. A
    // pill that doesn't include the curator's own MOD is drawn muted and
    // dashed so another MOD's assessment can't be mistaken for theirs.
    const pills = [
      { negated: false, count: positives },
      { negated: true, count: negatives },
    ]
      .filter((p) => p.count > 0)
      .map((p) => ({ ...p, mods: modsFor(byCurator, p.negated) }));
    // Disagreement only counts within one MOD: Y from FB and N from WB are two
    // MODs' answers, not a conflict.
    const conflictMods = pills.length === 2
      ? pills[0].mods.filter((m) => pills[1].mods.includes(m))
      : [];
    const showPolarityMarks = pills.length === 2;

    const pillTitle = (p) => {
      const what = p.negated ? 'N (no data)' : 'Y (data present)';
      const by = p.mods.length > 0 ? ` by ${p.mods.join(', ')}` : '';
      let mine = '';
      if (ownMod) {
        mine = p.mods.includes(ownMod)
          ? ` — includes your MOD (${ownMod})`
          : ` — another MOD's assessment, not your MOD (${ownMod})`;
      }
      return `${what}: ${p.count} professional biocurator topic tag(s)${by}${mine}`;
    };

    const attribution =
      byCurator.length > 0 ? (
        <div className="tetv-validation-by-list">
          {byCurator.map((g) => {
            const isOther = !!ownMod && !g.mods.includes(ownMod);
            return (
              <div
                className={`tetv-validation-by${isOther ? ' tetv-validation-by-other' : ''}`}
                key={`${g.name}|${g.negated}`}
                title={
                  isOther
                    ? `Another MOD's assessment (${g.mods.join(', ') || 'unknown MOD'}), not your MOD (${ownMod})`
                    : undefined
                }
              >
                {showPolarityMarks && (
                  <>
                    <span
                      className={`tetv-validation-by-mark ${
                        g.negated
                          ? 'tetv-validation-by-neg'
                          : 'tetv-validation-by-pos'
                      }`}
                      title={
                        g.negated
                          ? 'assessed N (no data for this topic)'
                          : 'assessed Y (data present for this topic)'
                      }
                    >
                      {g.negated ? 'N' : 'Y'}
                    </span>{' '}
                  </>
                )}
                {g.name}
                {g.mods.length > 0 && (
                  <>
                    {' '}
                    <span className="tetv-validation-by-mod">
                      ({g.mods.join(', ')})
                    </span>
                  </>
                )}
                {g.species.length > 0 && (
                  <>{' '}<SpeciesBadges taxonCuries={g.species} /></>
                )}
                {g.sources.length > 0 && (
                  <>{' '}<SourceIcons sources={g.sources} /></>
                )}
              </div>
            );
          })}
        </div>
      ) : null;

    // Assessments are per MOD: another MOD's assessment must not stop this
    // curator from assessing the topic for their own MOD (SCRUM-6256).
    const canAssess = !isAssessedByMod(params.value, accessLevelMod);
    return (
      <div className="tetv-validation-cell">
        {conflictMods.length > 0 && (
          <span
            className="tetv-validation-conflict-note"
            title={`Curators from ${conflictMods.join(', ')} disagree on this topic`}
          >
            {VALIDATION_STATE_LABELS.conflict} ({conflictMods.join(', ')})
          </span>
        )}
        <div className="tetv-validation-pills">
          {pills.map((p) => {
            const isOther = !!ownMod && !p.mods.includes(ownMod);
            return (
              <span
                key={p.negated ? 'N' : 'Y'}
                className={`tetv-validation-status ${
                  p.negated ? 'tetv-validated-neg' : 'tetv-validated-pos'
                }${isOther ? ' tetv-validated-other' : ''}`}
                title={pillTitle(p)}
              >
                <span className="tetv-validation-letter">
                  {p.negated
                    ? VALIDATION_STATE_LABELS.negative
                    : VALIDATION_STATE_LABELS.positive}
                </span>
                {p.mods.length > 0 && (
                  <span className="tetv-validation-mods">
                    (<ModList mods={p.mods} ownMod={ownMod} />)
                  </span>
                )}
              </span>
            );
          })}
        </div>
        {attribution}
        {canAssess && strip}
      </div>
    );
  }

  return (
    <div className="tetv-validation-cell">{strip}</div>
  );
}

export { professionalBiocuratorTopicTets };
