import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';

import { fetchTopicEntityTags } from '../../../actions/biblioActions';

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
      <Row className="Row-general">
        <Col className="Col-general" sm="12">
          <Spinner animation="border" size="sm" />
        </Col>
      </Row>
    );
  }

  // Nothing to show when no MOD has associated entities
  if (countsByMod.length === 0) {
    return null;
  }

  return (
    <Row className="Row-general entity-counts-by-mod" style={{ margin: '10px 0' }}>
      <Col sm="12">
        <table className="entity-counts-by-mod-table" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {countsByMod.map(({ mod, entityTypes }) => (
              <tr key={mod}>
                <td style={{ verticalAlign: 'top', fontWeight: 'bold', paddingRight: '1.5em', whiteSpace: 'nowrap' }}>
                  {mod}
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  {'[ '}
                  {entityTypes.map((entityType, idx) => (
                    <span key={entityType.name}>
                      {idx > 0 ? ', ' : ''}
                      {entityType.name} ({entityType.count})
                    </span>
                  ))}
                  {' ]'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Col>
    </Row>
  );
};

export default EntityCountsByMod;
