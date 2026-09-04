import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';

import { api } from '../../api';
import SectionLayoutModal from '../settings/SectionLayoutModal';
import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  PERSON_DISPLAY_LAYOUT_COMPONENT_NAME,
  layoutToCssGrid,
  defaultHiddenSections,
} from './personSections';
import './personSections.css';

const formatTimestamp = (s) => {
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

const muted = { color: '#888' };
const labelColStyle = {
  width: 200,
  fontWeight: 600,
  paddingTop: 2,
  textAlign: 'left',
  flexShrink: 0,
};
const tsStyle = { color: '#888', fontSize: '0.8em' };

const FieldRow = ({ label, children, ts }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={labelColStyle}>{label}:</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, textAlign: 'left', minWidth: 200 }}>
          {children ?? <span style={muted}>—</span>}
        </div>
        {ts && (
          <span style={{ ...tsStyle, whiteSpace: 'nowrap', paddingTop: 2 }}>{ts}</span>
        )}
      </div>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <Card className="mb-3">
    <Card.Header style={{ fontWeight: 600 }}>{title}</Card.Header>
    <Card.Body style={{ textAlign: 'left' }}>{children}</Card.Body>
  </Card>
);

const fullName = (n) => [n.first_name, n.middle_name, n.last_name].filter(Boolean).join(' ');

// The API resolves a cross-reference curie against the A-team resource
// descriptors and serves the link as `url` (with any per-page links under
// pages[].url), so the UI never builds these itself -- the MOD URL templates
// live in the a-team database, not here.
const xrefHref = (x) => {
  if (x.url) return x.url;
  if (Array.isArray(x.pages) && x.pages[0]?.url) return x.pages[0].url;
  return null;
};

const labRoles = (lp) => {
  const roles = [];
  if (lp.lab_position?.label) roles.push(lp.lab_position.label);
  if (lp.is_pi) roles.push(`PI since ${formatTimestamp(lp.is_pi)}`);
  if (lp.former_pi) roles.push(`former PI since ${formatTimestamp(lp.former_pi)}`);
  if (lp.alum) roles.push(`alum since ${formatTimestamp(lp.alum)}`);
  if (lp.is_lab_contact) roles.push('lab contact');
  if (lp.can_edit_lab) roles.push('can edit');
  return roles;
};

// ---- lineage helpers (read-only mirror of the editor's Lineage section) ----
// Rendered as column-aligned cells rather than a flowing sentence, so subject /
// relationship / object / dates line up down the section the way they do in the
// editor's LineageClaimRow. The first column matches FieldRow's label gutter so
// lineage rows align with every other section.
const personLabel = (name, curie) => name || curie || '(unknown)';
const lineageDates = (a, b) =>
  [a, b].some(Boolean)
    ? `${a ? String(a).slice(0, 10) : '?'}${b ? `–${String(b).slice(0, 10)}` : ''}`
    : '';

// One CSS grid spans every lineage row, so each column's track sizes itself to
// the widest cell in that column -- no fixed pixel widths to guess at, and no
// truncation. Rows emit bare cells (fragments) so they become direct grid
// children; the per-canonical wrapper uses `display: contents` to stay out of
// the way. The first track matches FieldRow's label gutter so lineage rows line
// up with every other section.
const LINEAGE_GRID = {
  display: 'grid',
  gridTemplateColumns: `${labelColStyle.width}px repeat(5, max-content)`,
  columnGap: 16,
  rowGap: 6,
  alignItems: 'baseline',
};
const lineageCell = { whiteSpace: 'nowrap' };

const LineageHeader = () => (
  <>
    <div />
    {['subject', 'relationship', 'object', 'dates', 'submitted by'].map((h) => (
      <span key={h} style={{ ...lineageCell, ...tsStyle }}>{h}</span>
    ))}
  </>
);

// One aligned lineage row, emitted as bare grid cells. `dim` greys a submission
// sitting under its canonical.
const LineageRow = ({ label, row, meta, status, dim = false }) => {
  const subject = personLabel(row.person_subject_name, row.person_subject_curie);
  const object = personLabel(row.person_object_name, row.person_object_curie);
  const relationship = row.relationship?.label || '';
  const dates = lineageDates(row.start_date, row.end_date);
  const valueStyle = dim ? { ...lineageCell, ...muted } : lineageCell;
  return (
    <>
      <div style={labelColStyle}>{label}:</div>
      <span style={valueStyle}>{subject}</span>
      <span style={valueStyle}>{relationship || <span style={muted}>—</span>}</span>
      <span style={valueStyle}>{object}</span>
      <span style={{ ...lineageCell, ...muted }}>{dates || '—'}</span>
      <span style={{ ...lineageCell, ...tsStyle }}>
        {meta}
        {status && <Badge variant="secondary" style={{ marginLeft: 6 }}>{status}</Badge>}
      </span>
    </>
  );
};

const PersonDisplay = ({ person }) => {
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;
  // The Laboratory page still has its own ccdisplay/wbdisplay tabs, so WB
  // curators keep being sent to its WB variant.
  const labHref = (curie) =>
    '/lab?q=' + encodeURIComponent(curie) + (effectiveMod === 'WB' ? '&tab=wbdisplay' : '');

  // ---- layout / visibility / metadata-toggle state (restored from saved prefs) ----
  // Mirrors PersonEditor, but persisted under its own component namespace so a
  // curator's reading arrangement is independent of their editing arrangement.
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() =>
    defaultHiddenSections(effectiveMod),
  );
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);

  // Once the user (or a loaded setting) explicitly decides section visibility, stop
  // letting the MOD default override it.
  const visibilityDecidedRef = useRef(false);

  useEffect(() => {
    if (visibilityDecidedRef.current) return;
    setHiddenSections(defaultHiddenSections(effectiveMod));
  }, [effectiveMod]);

  const applyPrefs = (prefs) => {
    if (!prefs) return;
    if (Array.isArray(prefs.layout)) setActiveLayout(prefs.layout);
    if (Array.isArray(prefs.hidden)) {
      setHiddenSections(new Set(prefs.hidden));
      visibilityDecidedRef.current = true;
    }
    if (typeof prefs.showTimestamps === 'boolean') setShowTimestamps(prefs.showTimestamps);
    if (typeof prefs.showCurator === 'boolean') setShowCurator(prefs.showCurator);
  };

  const toggleSection = (id) => {
    visibilityDecidedRef.current = true;
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compose the per-field metadata string honoring the two toggles independently.
  const metaLabel = (by, date) => {
    const parts = [];
    if (showCurator && by) parts.push(by);
    if (showTimestamps && date) parts.push(formatTimestamp(date));
    return parts.length ? parts.join(' · ') : null;
  };

  // ---- Lineage — not nested in the person record; fetched when the section shows ----
  const lineageVisible = !hiddenSections.has('lineage');
  const [submissions, setSubmissions] = useState([]);
  const [canonicals, setCanonicals] = useState([]);
  const personCurie = person?.curie;

  useEffect(() => {
    if (!lineageVisible || !personCurie) return undefined;
    let cancelled = false;
    Promise.all([
      api.get('/person_lineage_submission/person/' + personCurie)
        .then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      api.get('/person_lineage/person/' + personCurie)
        .then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    ]).then(([subs, canons]) => {
      if (cancelled) return;
      setSubmissions(subs);
      setCanonicals(canons);
    });
    return () => { cancelled = true; };
  }, [personCurie, lineageVisible]);

  if (!person) return null;

  const status = person.active_status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';

  const emails = person.emails ?? [];
  const activeEmails = emails.filter((e) => !e.date_made_old_email);
  const oldEmails = emails.filter((e) => !!e.date_made_old_email);
  const names = person.names ?? [];
  const xrefs = person.cross_references ?? [];
  const webpages = person.webpage ?? [];
  const institutions = person.institution ?? [];
  const notes = person.notes ?? [];
  const labPersons = person.lab_persons ?? [];

  const recordTs = metaLabel(person.updated_by, person.date_updated);

  const hasAddress =
    person.street_address || person.city || person.state || person.postal_code || person.country;

  const unlinkedSubs = submissions.filter((s) => !s.person_lineage_id);
  const subsForCanonical = (cid) => submissions.filter((s) => s.person_lineage_id === cid);

  // ---- build the section cards, keyed by section id (placed by the layout grid) ----
  const sectionRows = {};

  sectionRows.profile = (
    <Section title="Profile">
      <FieldRow label="display_name" ts={recordTs}>{person.display_name}</FieldRow>
      <FieldRow label="status" ts={recordTs}>{status}</FieldRow>
      <FieldRow label="privacy" ts={recordTs}>{person.privacy || 'hide_email'}</FieldRow>
    </Section>
  );

  sectionRows.names = (
    <Section title="Names">
      {names.length === 0 ? (
        <FieldRow label="name" />
      ) : (
        names.map((n, i) => (
          <FieldRow
            key={n.person_name_id ?? i}
            label={n.is_primary ? 'name (primary)' : 'name'}
            ts={metaLabel(n.updated_by, n.date_updated)}
          >
            {fullName(n) || <span style={muted}>(blank)</span>}
          </FieldRow>
        ))
      )}
    </Section>
  );

  sectionRows.email = (
    <Section title="Email">
      {activeEmails.length === 0 && oldEmails.length === 0 ? (
        <FieldRow label="email" />
      ) : (
        <>
          {activeEmails.map((e, i) => (
            <FieldRow
              key={e.email_address ?? i}
              label="email"
              ts={metaLabel(e.updated_by, e.date_updated)}
            >
              {e.email_address}
            </FieldRow>
          ))}
          {oldEmails.map((e, i) => {
            const oldNote = showTimestamps
              ? `old since ${formatTimestamp(e.date_made_old_email)}`
              : 'old';
            const editTs = metaLabel(e.updated_by, e.date_updated);
            const ts = editTs ? `${oldNote} · ${editTs}` : oldNote;
            return (
              <FieldRow
                key={`old-${e.email_address ?? i}`}
                label="old_email"
                ts={ts}
              >
                <span style={muted}>{e.email_address}</span>
              </FieldRow>
            );
          })}
        </>
      )}
    </Section>
  );

  sectionRows.address = (
    <Section title="Address">
      {!hasAddress ? (
        <FieldRow label="address" />
      ) : (
        <>
          <FieldRow label="address_last_updated">
            {person.address_last_updated ? formatTimestamp(person.address_last_updated) : null}
          </FieldRow>
          <FieldRow label="street">
            {person.street_address ? (
              <span style={{ whiteSpace: 'pre-wrap' }}>{person.street_address}</span>
            ) : null}
          </FieldRow>
          <FieldRow label="city">{person.city || null}</FieldRow>
          <FieldRow label="state">{person.state || null}</FieldRow>
          <FieldRow label="postal_code">{person.postal_code || null}</FieldRow>
          <FieldRow label="country">{person.country || null}</FieldRow>
        </>
      )}
    </Section>
  );

  sectionRows.institutions = (
    <Section title="Institutions">
      {institutions.length === 0 ? (
        <FieldRow label="institution" />
      ) : (
        institutions.map((inst, i) => (
          <FieldRow key={i} label="institution" ts={recordTs}>{inst}</FieldRow>
        ))
      )}
    </Section>
  );

  sectionRows.webpages = (
    <Section title="Webpages">
      {webpages.length === 0 ? (
        <FieldRow label="webpage" />
      ) : (
        webpages.map((url, i) => (
          <FieldRow key={i} label="webpage" ts={recordTs}>
            <a href={url} target="_blank" rel="noreferrer noopener">{url}</a>
          </FieldRow>
        ))
      )}
    </Section>
  );

  sectionRows.laboratories = (
    <Section title="Laboratories">
      {labPersons.length === 0 ? (
        <FieldRow label="laboratory" />
      ) : (
        labPersons.map((lp, i) => {
          const label =
            [lp.laboratory_name, lp.laboratory_strain_designation].filter(Boolean).join(' · ') ||
            lp.laboratory_curie ||
            '(unknown lab)';
          const roles = labRoles(lp);
          return (
            <FieldRow
              key={lp.laboratory_person_id ?? i}
              label="laboratory"
              ts={metaLabel(lp.updated_by, lp.date_updated)}
            >
              {lp.laboratory_curie ? (
                <a href={labHref(lp.laboratory_curie)}>{label}</a>
              ) : (
                <span>{label}</span>
              )}
              {roles.length > 0 && (
                <span style={{ marginLeft: 8 }}>
                  {roles.map((r, j) => (
                    <Badge key={j} variant="info" style={{ marginRight: 4 }}>{r}</Badge>
                  ))}
                </span>
              )}
            </FieldRow>
          );
        })
      )}
    </Section>
  );

  sectionRows.cross_references = (
    <Section title="Cross references">
      {xrefs.length === 0 ? (
        <FieldRow label="xref" />
      ) : (
        xrefs.map((x, i) => {
          const href = xrefHref(x);
          const label = x.curie_prefix || 'xref';
          const value = x.curie || '';
          const isObsolete = x.is_obsolete === true;
          // Only override styling for an obsolete xref. Setting color:inherit +
          // textDecoration:none on a live one is what made ORCID render as plain
          // text instead of a link.
          const valStyle = isObsolete
            ? { textDecoration: 'line-through', color: '#888' }
            : undefined;
          const editTs = metaLabel(x.updated_by, x.date_updated);
          const obsoleteNote = isObsolete ? 'obsolete' : null;
          const ts = [obsoleteNote, editTs].filter(Boolean).join(' · ') || null;
          return (
            <FieldRow key={x.person_cross_reference_id ?? i} label={label} ts={ts}>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer noopener" style={valStyle}>
                  {value}
                </a>
              ) : (
                <span style={valStyle}>{value}</span>
              )}
            </FieldRow>
          );
        })
      )}
    </Section>
  );

  sectionRows.research_interest = (
    <Section title="Research interest (public)">
      <FieldRow label="research interest" ts={recordTs}>
        {person.biography_research_interest ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{person.biography_research_interest}</span>
        ) : null}
      </FieldRow>
    </Section>
  );

  sectionRows.comments = (
    <Section title="Comments (internal)">
      {notes.length === 0 ? (
        <FieldRow label="comment" />
      ) : (
        notes.map((n, i) => (
          <FieldRow
            key={n.person_note_id ?? i}
            label="comment"
            ts={metaLabel(n.updated_by, n.date_updated)}
          >
            <span style={{ whiteSpace: 'pre-wrap' }}>{n.note}</span>
          </FieldRow>
        ))
      )}
    </Section>
  );

  // Read-only mirror of the editor's Lineage section: canonical connections with
  // the submissions that produced them, then any submission not yet promoted to a
  // canonical. No validate/reject controls — those live in the editor.
  sectionRows.lineage = (
    <Section title="Lineage">
      {canonicals.length === 0 && unlinkedSubs.length === 0 ? (
        <FieldRow label="connection" />
      ) : (
        // Scroll rather than wrap: wrapping would break the column alignment
        // that is the point of this layout when a narrow grid column is in use.
        <div style={{ overflowX: 'auto' }}>
          <div style={LINEAGE_GRID}>
            <LineageHeader />
            {canonicals.map((c) => (
              <div key={c.person_lineage_id} style={{ display: 'contents' }}>
                <LineageRow label="connection" row={c} />
                {subsForCanonical(c.person_lineage_id).map((s) => (
                  <LineageRow
                    key={s.person_lineage_submission_id}
                    label="↳ submission"
                    row={s}
                    meta={metaLabel(s.who_sent_this, null)}
                    status={s.status}
                    dim
                  />
                ))}
              </div>
            ))}
            {unlinkedSubs.map((s) => (
              <LineageRow
                key={s.person_lineage_submission_id}
                label="submission"
                row={s}
                meta={metaLabel(s.who_sent_this, null)}
                status={s.status}
              />
            ))}
          </div>
        </div>
      )}
    </Section>
  );

  // ---- arrange sections per the active layout, dropping hidden ones ----
  const grid = layoutToCssGrid(activeLayout);
  const wideLayout = !!(grid && grid.multiColumn);
  const knownIds = SECTION_DEFS.map((s) => s.id);
  const orderedIds = (
    grid ? [...grid.order, ...knownIds.filter((id) => !grid.order.includes(id))] : knownIds
  ).filter((id) => !hiddenSections.has(id));

  const sectionsRender = grid ? (
    <div
      className={`person-section-grid${wideLayout ? ' person-section-grid--wide' : ''}`}
      style={{ '--person-col-floor': `${grid.colFloor}px` }}
    >
      {orderedIds.map((id) => (
        <div
          key={id}
          className="person-section"
          style={grid.styles[id] || { gridColumn: '1 / -1' }}
        >
          {sectionRows[id]}
        </div>
      ))}
    </div>
  ) : (
    orderedIds.map((id) => (
      <React.Fragment key={id}>{sectionRows[id]}</React.Fragment>
    ))
  );

  return (
    <Container fluid>
      <div style={{ textAlign: 'left' }}>
        <Card className="mb-3" style={{ borderLeft: '4px solid #6b4a8a' }}>
          <Card.Body>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ marginBottom: 4 }}>
                  {person.display_name || <span style={muted}>(no standard name)</span>}
                </h4>
                <div style={{ ...muted, fontSize: '0.9em' }}>{person.curie}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
                {person.unsubscribe && (
                  <Badge variant="warning" style={{ fontSize: '0.95em' }}>unsubscribed</Badge>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end mb-3">
          <SectionLayoutModal
            sectionDefs={SECTION_DEFS}
            defaultLayout={DEFAULT_LAYOUT}
            componentName={PERSON_DISPLAY_LAYOUT_COMPONENT_NAME}
            onApplyPrefs={applyPrefs}
            current={{
              layout: activeLayout,
              hidden: Array.from(hiddenSections),
              showTimestamps,
              showCurator,
            }}
            onToggleSection={toggleSection}
            onToggleTimestamps={setShowTimestamps}
            onToggleCurator={setShowCurator}
          />
        </div>

        {sectionsRender}

        <div style={{ ...muted, fontSize: '0.8em', textAlign: 'left', marginTop: 8 }}>
          Created by {person.created_by || '?'} on {formatTimestamp(person.date_created)}
          {' · '}
          Updated by {person.updated_by || '?'} on {formatTimestamp(person.date_updated)}
        </div>
      </div>
    </Container>
  );
};

export default PersonDisplay;
