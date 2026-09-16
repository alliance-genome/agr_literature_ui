import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import TopicEntityTagActions from '../TopicEntityTagActions';

// The grid passes rows through TopicEntityTable's display transform first, so a
// self-validated curator tag reaches this renderer with
// validation_by_professional_biocurator already blanked ('').
const makeStore = () =>
  createStore(() => ({
    isLogged: { cognitoMod: 'WB', testerMod: 'No' },
    biblio: { editTag: null, filteredTags: null },
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

const renderActions = (rowOverrides = {}) =>
  render(
    <Provider store={makeStore()}>
      <TopicEntityTagActions data={{ ...baseRow, ...rowOverrides }} />
    </Provider>
  );

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
    renderActions({
      validation_by_professional_biocurator: '',
      topic_entity_tag_source: {
        source_method: 'abc_literature_system',
        validation_type: 'professional_biocurator',
        secondary_data_provider_abbreviation: 'SGD',
      },
    });
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });

  test('still hides when the untransformed validated_right_self value comes through', () => {
    renderActions({
      validation_by_professional_biocurator: 'validated_right_self',
      topic_entity_tag_source: {
        source_method: 'abc_literature_system',
        validation_type: 'professional_biocurator',
        secondary_data_provider_abbreviation: 'SGD',
      },
    });
    expect(screen.queryByRole('button', { name: 'Show validating tags' })).toBeNull();
  });

  test.each(['validated_right', 'validated_wrong', 'validation_conflict'])(
    'shows for a curator tag with a second curator validation (%s)',
    (value) => {
      renderActions({
        validation_by_professional_biocurator: value,
        topic_entity_tag_source: {
          source_method: 'abc_literature_system',
          validation_type: 'professional_biocurator',
          secondary_data_provider_abbreviation: 'SGD',
        },
      });
      expect(screen.getByRole('button', { name: 'Show validating tags' })).toBeInTheDocument();
    }
  );
});
