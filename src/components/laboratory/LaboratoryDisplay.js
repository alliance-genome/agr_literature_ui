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
  LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME,
  layoutToCssGrid,
  defaultHiddenSections,
} from './laboratorySections';
import '../sectionGrid.css';

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

// Card titles come from the shared SECTION_DEFS so the cards on screen and the
// settings checklist can never drift apart.
const LABEL = Object.fromEntries(SECTION_DEFS.map((s) => [s.id, s.label]));

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

const personRoles = (lp) => {
  const roles = [];
  if (lp.lab_position?.label) roles.push(lp.lab_position.label);
  if (lp.is_pi) roles.push(`PI since ${formatTimestamp(lp.is_pi)}`);
  if (lp.former_pi) roles.push(`former PI since ${formatTimestamp(lp.former_pi)}`);
  if (lp.alum) roles.push(`alum since ${formatTimestamp(lp.alum)}`);
  if (lp.is_lab_contact) roles.push('lab contact');
  if (lp.can_edit_lab) roles.push('can edit');
  return roles;
};

const LaboratoryDisplay = ({ laboratory: laboratoryProp }) => {
  // The parent fetches once per lookup and does not refetch on a tab change, and
  // LaboratoryEditor saves deltas into its own local state without telling
  // anyone, so edits made there would not show up here. Hold the record in
  // state, seeded from the prop so there is no empty first paint, and re-read it
  // on mount -- the tab switch is the refresh point. A refetch also picks up
  // values the editor never sent (date_updated, anything set by a DB trigger)
  // and edits made in another browser tab or by another curator.
  const [laboratory, setLaboratory] = useState(laboratoryProp);

  // Display is the Person page's default tab, so no ?tab= is needed.
  const personHref = (curie) => '/person?personCurie=' + encodeURIComponent(curie);

  // No laboratory section is MOD-gated today, so defaultHiddenSections is empty
  // for everyone; the effective MOD is read anyway so a future `mods` gate on a
  // section works without further wiring, exactly as on the Person page.
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

  // ---- layout / visibility / metadata-toggle state (restored from saved prefs) ----
  // Mirrors LaboratoryEditor, but persisted under its own component namespace so
  // a curator's reading arrangement is independent of their editing arrangement.
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() =>
    defaultHiddenSections(effectiveMod),
  );
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);

  // Once the user (or a loaded setting) explicitly decides section visibility,
  // stop letting the MOD default override it.
  const visibilityDecidedRef = useRef(false);

  useEffect(() => {
    if (visibilityDecidedRef.current) return;
    setHiddenSections(defaultHiddenSections(effectiveMod));
  }, [effectiveMod]);

  // Keep in step if the parent reloads the same curie (a repeated search), which
  // does not remount us because Laboratory.js keys this component by curie.
  useEffect(() => { setLaboratory(laboratoryProp); }, [laboratoryProp]);

  // ---- refresh the record on mount, so edits made in the Editor tab show here ----
  useEffect(() => {
    const curie = laboratoryProp?.curie;
    if (!curie) return undefined;
    let cancelled = false;
    api.get('/laboratory/' + curie)
      .then((r) => {
        // Keep the record we already have if the response is not a laboratory.
        if (!cancelled && r?.data?.curie) setLaboratory(r.data);
      })
      .catch(() => { /* keep the record we already have */ });
    return () => { cancelled = true; };
  }, [laboratoryProp?.curie]);

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

  if (!laboratory) return null;

  const lab = laboratory;
  const status = lab.status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';
  const recordTs = metaLabel(lab.updated_by, lab.date_updated);

  const emails = lab.email ?? [];
  const institutions = lab.institution ?? [];
  const webpages = lab.webpage ?? [];
  const alleles = lab.allele_designations ?? [];
  const xrefs = lab.cross_references ?? [];
  const labPersons = lab.lab_persons ?? [];

  const hasAddress =
    lab.street_address || lab.city || lab.state || lab.postal_code || lab.country;

  // ---- build the section cards, keyed by section id (placed by the layout grid) ----
  const sectionRows = {};

  sectionRows.profile = (
    <Section title={LABEL.profile}>
      <FieldRow label="name" ts={recordTs}>{lab.name}</FieldRow>
      <FieldRow label="strain_designation" ts={recordTs}>{lab.strain_designation}</FieldRow>
      <FieldRow label="status" ts={recordTs}>{status}</FieldRow>
      {/* lab_is_open = who may edit the lab: false -> no one, true -> anyone */}
      <FieldRow label="lab_is_open" ts={recordTs}>{lab.lab_is_open ? 'anyone' : 'no one'}</FieldRow>
    </Section>
  );

  sectionRows.address = (
    <Section title={LABEL.address}>
      {!hasAddress ? (
        <FieldRow label="address" />
      ) : (
        <>
          <FieldRow label="street" ts={recordTs}>
            {lab.street_address ? (
              <span style={{ whiteSpace: 'pre-wrap' }}>{lab.street_address}</span>
            ) : null}
          </FieldRow>
          <FieldRow label="city" ts={recordTs}>{lab.city || null}</FieldRow>
          <FieldRow label="state" ts={recordTs}>{lab.state || null}</FieldRow>
          <FieldRow label="postal_code" ts={recordTs}>{lab.postal_code || null}</FieldRow>
          <FieldRow label="country" ts={recordTs}>{lab.country || null}</FieldRow>
        </>
      )}
    </Section>
  );

  sectionRows.institutions = (
    <Section title={LABEL.institutions}>
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
    <Section title={LABEL.webpages}>
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

  sectionRows.emails = (
    <Section title={LABEL.emails}>
      {emails.length === 0 ? (
        <FieldRow label={`email (${lab.email_visibility || 'not_shown'})`} />
      ) : (
        emails.map((addr, i) => (
          <FieldRow key={i} label={`email (${lab.email_visibility || 'not_shown'})`} ts={recordTs}>
            {addr}
          </FieldRow>
        ))
      )}
    </Section>
  );

  sectionRows.research = (
    <Section title={LABEL.research}>
      <FieldRow label="research_area" ts={recordTs}>{lab.research_area}</FieldRow>
      <FieldRow label="short_research_description" ts={recordTs}>
        {lab.short_research_description ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{lab.short_research_description}</span>
        ) : null}
      </FieldRow>
      <FieldRow label="additional_information" ts={recordTs}>
        {lab.additional_information ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{lab.additional_information}</span>
        ) : null}
      </FieldRow>
      <FieldRow label="private_note" ts={recordTs}>
        {lab.private_note ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{lab.private_note}</span>
        ) : null}
      </FieldRow>
    </Section>
  );

  sectionRows.allele_designations = (
    <Section title={LABEL.allele_designations}>
      {alleles.length === 0 ? (
        <FieldRow label="allele_designation" />
      ) : (
        alleles.map((ad, i) => (
          <FieldRow
            key={ad.laboratory_allele_designation_id ?? i}
            label={ad.mod_abbreviation || `mod ${ad.mod_id}`}
            ts={metaLabel(ad.updated_by, ad.date_updated)}
          >
            {ad.allele_designation}
          </FieldRow>
        ))
      )}
    </Section>
  );

  sectionRows.lab_members = (
    <Section title={LABEL.lab_members}>
      {labPersons.length === 0 ? (
        <FieldRow label="lab_person" />
      ) : (
        labPersons.map((lp, i) => {
          const label = lp.person_display_name || lp.person_curie || '(unknown person)';
          const roles = personRoles(lp);
          return (
            <FieldRow
              key={lp.laboratory_person_id ?? i}
              label="lab_person"
              ts={metaLabel(lp.updated_by, lp.date_updated)}
            >
              {lp.person_curie ? (
                <a href={personHref(lp.person_curie)}>{label}</a>
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
    <Section title={LABEL.cross_references}>
      {xrefs.length === 0 ? (
        <FieldRow label="xref" />
      ) : (
        xrefs.map((x, i) => {
          // The API resolves the curie against the A-team resource descriptors
          // and serves the link as `url` (per-page links under pages[].url).
          // `pages` on its own is a list of page NAMES, not URLs.
          // pages[0].url first, matching IdsCell.jsx and PersonDisplay.
          const href = (Array.isArray(x.pages) && x.pages[0]?.url) || x.url || null;
          const isObsolete = x.is_obsolete === true;
          // Only override styling for an obsolete xref -- color:inherit plus
          // textDecoration:none on a live one stops it reading as a link.
          const valStyle = isObsolete
            ? { textDecoration: 'line-through', color: '#888' }
            : undefined;
          const editTs = metaLabel(x.updated_by, x.date_updated);
          const ts = [isObsolete ? 'obsolete' : null, editTs].filter(Boolean).join(' · ') || null;
          return (
            <FieldRow key={x.laboratory_cross_reference_id ?? i} label={x.curie_prefix || 'xref'} ts={ts}>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer noopener" style={valStyle}>
                  {x.curie}
                </a>
              ) : (
                <span style={valStyle}>{x.curie}</span>
              )}
            </FieldRow>
          );
        })
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
      className={`section-grid${wideLayout ? ' section-grid--wide' : ''}`}
      style={{ '--section-col-floor': `${grid.colFloor}px` }}
    >
      {orderedIds.map((id) => (
        <div
          key={id}
          className="section-grid__item"
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
                  {lab.name || <span style={muted}>(no name)</span>}
                </h4>
                {lab.strain_designation && (
                  <div style={muted}>strain_designation: {lab.strain_designation}</div>
                )}
                <div style={{ ...muted, fontSize: '0.9em' }}>{lab.curie}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end mb-3">
          <SectionLayoutModal
            sectionDefs={SECTION_DEFS}
            defaultLayout={DEFAULT_LAYOUT}
            componentName={LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME}
            pageLabel="Display"
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
          Created by {lab.created_by || '?'} on {formatTimestamp(lab.date_created)}
          {' · '}
          Updated by {lab.updated_by || '?'} on {formatTimestamp(lab.date_updated)}
        </div>
      </div>
    </Container>
  );
};

export default LaboratoryDisplay;
