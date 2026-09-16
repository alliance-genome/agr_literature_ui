import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import TopicEntityTagActions from '../TopicEntityTagActions';

// The grid passes rows through TopicEntityTable's display transform first, so a
// self-validated curator tag reaches this renderer with
// validation_by_professional_biocurator already blanked ('').
const makeStore = (topicEntityTags = []) =>
  createStore(() => ({
    isLogged: { cognitoMod: 'WB', testerMod: 'No' },
    biblio: { editTag: null, filteredTags: null, topicEntityTags },
  }));

const baseRow = {
  topic_entity_tag_id: 1,
  validating_tags: [2],
  validation_by_professional_biocurator: '',
  topic_entity_tag_source: {
    source_method: 'some_pipeline',
    validation_type: null,
    secondary_data_provider_abbreviation: 'WB',
  },
};

const renderActions = (rowOverrides = {}, topicEntityTags = []) =>
  render(
    <Provider store={makeStore(topicEntityTags)}>
      <TopicEntityTagActions data={{ ...baseRow, ...rowOverrides }} />
    </Provider>
  );

const curatorRow = {
  validation_by_professional_biocurator: '',
  topic_entity_tag_source: {
    source_method: 'abc_literature_system',
    validation_type: 'professional_biocurator',
    secondary_data_provider_abbreviation: 'SGD',
  },
};

describe('validating-tags magnifying glass (SCRUM-4501)', () => {
  test('shows for a non-curator tag with validating tags', () => {
    renderActions();
    expect(screen.getByRole('button', { name: 'Show validating tags' })).toBeInTheDocument();
  });

  test('hides when there are no validating tags', () => {
    renderActions({ validating_tags: [] });
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });

  test('hides for a curator tag whose only curator validation is itself', () => {
    // Screenshot case from the ticket: curator-created tag, an author tag sits in
    // validating_tags, but the professional-biocurator rollup is self-only.
    const authorTag = {
      topic_entity_tag_id: 2,
      topic_entity_tag_source: { validation_type: 'author' },
    };
    renderActions(curatorRow, [authorTag]);
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });

  test('still hides when the untransformed validated_right_self value comes through', () => {
    renderActions({ ...curatorRow, validation_by_professional_biocurator: 'validated_right_self' });
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });

  test.each(['validated_right', 'validated_wrong', 'validation_conflict'])(
    'shows for a curator tag with a second curator validation (%s)',
    (value) => {
      renderActions({ ...curatorRow, validation_by_professional_biocurator: value });
      expect(screen.getByRole('button', { name: 'Show validating tags' })).toBeInTheDocument();
    }
  );

  test('shows for a curator tag validated by a professional_curator-typed grid validation', () => {
    // Some MODs' abc curator source is typed professional_curator, which the backend
    // professional-biocurator rollup ignores — the rollup stays self ('') even though
    // a second curator validated the tag. The direct validating-tags lookup catches it.
    const gridValidationTag = {
      topic_entity_tag_id: 2,
      topic_entity_tag_source: { validation_type: 'professional_curator' },
    };
    renderActions(curatorRow, [gridValidationTag]);
    expect(screen.getByRole('button', { name: 'Show validating tags' })).toBeInTheDocument();
  });

  test('ignores curator tags that are not among the validating tags', () => {
    const unrelatedCuratorTag = {
      topic_entity_tag_id: 99,
      topic_entity_tag_source: { validation_type: 'professional_curator' },
    };
    renderActions(curatorRow, [unrelatedCuratorTag]);
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });
});
