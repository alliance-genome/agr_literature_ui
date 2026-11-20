import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Spinner from 'react-bootstrap/Spinner';

import { api } from '../../../api';

// Centered panel, sized to match the workflow tables (which center an 80%-wide
// grid). The card itself stays left-aligned inside so multiple MOD rows are easy
// to scan.
const panelWrapperStyle = { display: 'flex', justifyContent: 'center' };
const panelStyle = { width: '80%', maxWidth: 900 };

const cellBorder = '1px solid #dee2e6';
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  border: cellBorder,
  fontSize: '0.9rem'
};
const headerCellStyle = {
  backgroundColor: 'var(--light-blue)',
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: cellBorder,
  fontWeight: 'bold'
};
const modCellStyle = {
  width: 80,
  fontWeight: 'bold',
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: cellBorder,
  verticalAlign: 'top',
  whiteSpace: 'nowrap'
};
const entitiesCellStyle = {
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: cellBorder,
  verticalAlign: 'top',
  color: '#212529'
};

// API entity type names arrive lowercase (e.g. "gene"); show them with a leading
// capital ("Gene") to match the rest of the editor chrome.
const capitalizeFirst = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);

/**
 * Reusable summary of the unique entities associated with a reference, grouped
 * by MOD and entity type. There is no distinction between manual and automated
 * tags. The MOD is taken from each tag's secondary data provider.
 *
 * The counts come from GET /topic_entity_tag/entity_counts_by_mod/<curie>
 * (SCRUM-6620): the server counts distinct entities per (owning MOD, entity
 * type) over the WHOLE tag set — the previous client-side aggregation over
 * the 8,000-row capped fetch undercounted large-scale papers.
 *
 * Acceptance criteria honored here:
 *   - counts of entities associated with a paper for each MOD
 *   - only show a list for MODs that have associated entities
 *   - only show entity types with a count > 0
 *   - entity types listed in alphabetical order
 */
// Shared shape for display: {mod: {name: count}} -> sorted
// [{mod, entityTypes: [{name, count}]}], MODs and type names alphabetical,
// zero counts and empty MODs dropped.
const toSortedModGroups = (byMod) =>
  Object.keys(byMod)
    .sort((a, b) => a.localeCompare(b))
    .map((mod) => ({
      mod,
      entityTypes: Object.keys(byMod[mod])
        .map((name) => ({ name, count: byMod[mod][name] }))
        .filter((entityType) => entityType.count > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
    }))
    .filter((modGroup) => modGroup.entityTypes.length > 0);

const EntityCountsByMod = ({ referenceCurie: referenceCurieProp }) => {
  const storeReferenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const referenceCurie = referenceCurieProp || storeReferenceCurie;
  const biblioUpdatingEntityAdd = useSelector((state) => state.biblio.biblioUpdatingEntityAdd);
  // Fallback source only: when the counts endpoint is unavailable (this UI
  // deployed before the backend), aggregate the capped redux list the way
  // the panel used to, instead of silently disappearing (review finding).
  const topicEntityTags = useSelector((state) => state.biblio.topicEntityTags);

  const [serverCounts, setServerCounts] = useState(null); // null = not loaded yet
  const [endpointFailed, setEndpointFailed] = useState(false);

  // New reference: show the spinner again (refetches for the SAME reference
  // keep the previous numbers on screen instead of flashing).
  useEffect(() => {
    setServerCounts(null);
    setEndpointFailed(false);
  }, [referenceCurie]);

  useEffect(() => {
    if (!referenceCurie) return undefined;
    // While an add/edit/delete is in flight, wait; when the counter returns
    // to 0 this effect re-runs and refetches, so the panel tracks tag changes
    // like the table does (review finding: the counts went stale right after
    // a curator added tags).
    if (biblioUpdatingEntityAdd > 0) return undefined;
    let cancelled = false;
    api.get(`/topic_entity_tag/entity_counts_by_mod/${referenceCurie}`)
      .then((res) => {
        if (cancelled) return;
        setServerCounts(Array.isArray(res.data) ? res.data : []);
        setEndpointFailed(false);
      })
      .catch((err) => {
        console.error('Failed to load entity counts by MOD:', err);
        if (!cancelled) setEndpointFailed(true);
      });
    return () => { cancelled = true; };
  }, [referenceCurie, biblioUpdatingEntityAdd]);

  const countsByMod = useMemo(() => {
    if (endpointFailed) {
      // Old client-side aggregation (distinct entities per MOD and type name)
      // over the capped fetch — undercounts large-scale papers, but keeps the
      // panel alive against an older backend.
      const byMod = {};
      for (const tag of topicEntityTags || []) {
        const mod = tag?.tag_source?.secondary_data_provider_abbreviation;
        const entityType = tag?.entity_type_name;
        const entity = tag?.entity;
        if (!mod || !entityType || !entity) continue;
        if (!byMod[mod]) byMod[mod] = {};
        if (!byMod[mod][entityType]) byMod[mod][entityType] = new Set();
        byMod[mod][entityType].add(entity);
      }
      const sized = {};
      for (const mod of Object.keys(byMod)) {
        sized[mod] = {};
        for (const name of Object.keys(byMod[mod])) sized[mod][name] = byMod[mod][name].size;
      }
      return toSortedModGroups(sized);
    }
    // Server rows: one per (owning MOD, entity type). Two entity-type curies
    // can share a display name; their counts are summed under it.
    const byMod = {};
    for (const row of serverCounts || []) {
      const mod = row.mod_abbreviation;
      const name = row.entity_type_name || row.entity_type;
      if (!mod || !name || !row.entity_count) continue;
      if (!byMod[mod]) byMod[mod] = {};
      byMod[mod][name] = (byMod[mod][name] || 0) + row.entity_count;
    }
    return toSortedModGroups(byMod);
  }, [serverCounts, endpointFailed, topicEntityTags]);

  // Loading the data for this reference for the first time
  if (serverCounts === null && !endpointFailed) {
    return (
      <div style={panelWrapperStyle}>
        <div style={panelStyle}>
          <div className="text-center" style={{ padding: '10px' }}>
            <Spinner animation="border" size="sm" />
          </div>
        </div>
      </div>
    );
  }

  // Nothing to show when no MOD has associated entities
  if (countsByMod.length === 0) {
    return null;
  }

  return (
    <div style={panelWrapperStyle}>
      <div style={panelStyle}>
        <strong style={{ display: 'block', margin: '20px 0 10px', textAlign: 'center' }}>
          Entity Counts by MOD
        </strong>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>MOD</th>
              <th style={headerCellStyle}>Entities</th>
            </tr>
          </thead>
          <tbody>
            {countsByMod.map(({ mod, entityTypes }) => (
              <tr key={mod}>
                <td style={modCellStyle}>{mod}</td>
                <td style={entitiesCellStyle}>
                  {entityTypes
                    .map((entityType) => `${capitalizeFirst(entityType.name)} (${entityType.count})`)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntityCountsByMod;
