import biblioReducer from '../biblioReducer';
import { mergeTaxonNames } from '../../actions/biblioActions';

// SCRUM-6256: species names looked up on demand (e.g. a genus a curator picked)
// are merged into the MOD-taxa names loaded by fetchTaxonData.
describe('MERGE_TAXON_NAMES', () => {
  test('adds names without dropping the loaded taxon names', () => {
    const state = biblioReducer(undefined, {
      type: 'FETCH_TAXON_DATA_SUCCESS',
      payload: {
        modToTaxon: { FB: ['NCBITaxon:7227'] },
        curieToNameTaxon: { 'NCBITaxon:7227': 'Drosophila melanogaster' },
      },
    });
    const next = biblioReducer(
      state,
      mergeTaxonNames({ 'NCBITaxon:7214': 'Drosophila' })
    );
    expect(next.curieToNameTaxon).toEqual({
      'NCBITaxon:7227': 'Drosophila melanogaster',
      'NCBITaxon:7214': 'Drosophila',
    });
    expect(next.modToTaxon).toEqual({ FB: ['NCBITaxon:7227'] });
  });
});
