import {
  evidenceAssertionName,
  evidenceAssertionLabel,
} from '../buildEntries';

describe('evidenceAssertionName (offline fallback map)', () => {
  test('maps known curies to short labels', () => {
    expect(evidenceAssertionName('ECO:0008004')).toBe('machine learning');
    expect(evidenceAssertionName('ECO:0008025')).toBe('neural network method');
  });
  test('is case-insensitive on the curie', () => {
    expect(evidenceAssertionName('eco:0008021')).toBe('string matching');
  });
  test('returns the curie unchanged when unknown', () => {
    expect(evidenceAssertionName('ECO:9999999')).toBe('ECO:9999999');
  });
  test('handles empty input', () => {
    expect(evidenceAssertionName('')).toBe('unspecified evidence');
  });
});

describe('evidenceAssertionLabel (curated map first, backend name as fallback)', () => {
  test('keeps the curated short label for a mapped code, ignoring the backend name', () => {
    const entries = [
      {
        source_evidence_assertion: 'ECO:0008025',
        source_evidence_assertion_name:
          'neural network method evidence used in automatic assertion',
      },
    ];
    // ECO:0008025 is in the offline map, so its short curated label wins and the
    // grid's established titles stay stable.
    expect(evidenceAssertionLabel(entries, 'ECO:0008025')).toBe(
      'neural network method'
    );
  });
  test('uses source_evidence_assertion_name for a code missing from the map', () => {
    const entries = [
      {
        source_evidence_assertion: 'ECO:1234567',
        source_evidence_assertion_name: 'some resolved label',
      },
    ];
    expect(evidenceAssertionLabel(entries, 'ECO:1234567')).toBe(
      'some resolved label'
    );
  });
  test('reads the resolved name from a nested raw tag for an unmapped code', () => {
    const entries = [
      {
        tets: [
          {
            topic_entity_tag_source: {
              source_evidence_assertion_name: 'some resolved label',
            },
          },
        ],
      },
    ];
    expect(evidenceAssertionLabel(entries, 'ECO:1234567')).toBe(
      'some resolved label'
    );
  });
  test('falls back to the raw curie when neither map nor backend name matches', () => {
    expect(evidenceAssertionLabel([], 'ECO:9999999')).toBe('ECO:9999999');
  });
});
