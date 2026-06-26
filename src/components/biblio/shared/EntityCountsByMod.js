import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Spinner from 'react-bootstrap/Spinner';

import { fetchTopicEntityTags } from '../../../actions/biblioActions';

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
 * Data is loaded into (and read from) the redux store so any reference-based
 * (Biblio) page can reuse it. The component is self-contained so it can be
 * dropped into the workflow editor, the topic/entity editor, the biblio
 * display, or any other place in the future.
 *
 * Acceptance criteria honored here:
 *   - counts of entities associated with a paper for each MOD
 *   - only show a list for MODs that have associated entities
 *   - only show entity types with a count > 0
 *   - entity types listed in alphabetical order
 */
const EntityCountsByMod = ({ referenceCurie: referenceCurieProp }) => {
  const dispatch = useDispatch();

  const storeReferenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const referenceCurie = referenceCurieProp || storeReferenceCurie;

  const topicEntityTags = useSelector((state) => state.biblio.topicEntityTags);
  const topicEntityTagsLoading = useSelector((state) => state.biblio.topicEntityTagsLoading);
  const topicEntityTagsCurie = useSelector((state) => state.biblio.topicEntityTagsCurie);

  useEffect(() => {
    if (referenceCurie) {
      dispatch(fetchTopicEntityTags(referenceCurie));
    }
  }, [dispatch, referenceCurie]);

  // Group unique entities by MOD then by entity type.
  const countsByMod = useMemo(() => {
    const byMod = {};
    for (const tag of topicEntityTags || []) {
      const mod = tag?.topic_entity_tag_source?.secondary_data_provider_abbreviation;
      const entityType = tag?.entity_type_name;
      const entity = tag?.entity; // entity curie; unique key for counting
      // Skip rows without a MOD, entity type, or an actual entity (e.g. topic-only tags)
      if (!mod || !entityType || !entity) continue;
      if (!byMod[mod]) byMod[mod] = {};
      if (!byMod[mod][entityType]) byMod[mod][entityType] = new Set();
      byMod[mod][entityType].add(entity);
    }

    return Object.keys(byMod)
      .sort((a, b) => a.localeCompare(b))
      .map((mod) => ({
        mod,
        entityTypes: Object.keys(byMod[mod])
          .map((name) => ({ name, count: byMod[mod][name].size }))
          .filter((entityType) => entityType.count > 0)
          .sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter((modGroup) => modGroup.entityTypes.length > 0);
  }, [topicEntityTags]);

  // Loading the data for this reference for the first time
  if (topicEntityTagsLoading && topicEntityTagsCurie !== referenceCurie) {
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
