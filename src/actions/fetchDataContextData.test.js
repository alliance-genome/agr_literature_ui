import { api } from '../api';
import { fetchDataContextData } from './biblioActions';

jest.mock('../api', () => ({ api: { get: jest.fn() } }));

// SCRUM-6815: the data context tree as of the 2026-10-30 ATP release.
const t = (curie, name) => ({ curie, name });
const ALL = [
  t('ATP:0000324', 'mentioned data'),
  t('ATP:0000360', 'background information'),
  t('ATP:0000405', 'experimental data'),
  t('ATP:0000406', 'experimentally studied entity'),
  t('ATP:0000407', 'primary studied entity'),
  t('ATP:0000408', 'additional studied entity'),
  t('ATP:0000409', 'supporting experimental entity'),
  t('ATP:0000327', 'genetic marker'),
  t('ATP:0000328', 'expression marker'),
  t('ATP:0000410', 'experimental control'),
  t('ATP:0000404', 'nomenclature error'),
];
const CHILDREN = {
  'ATP:0000323': [t('ATP:0000324', 'mentioned data'), t('ATP:0000404', 'nomenclature error')],
  'ATP:0000324': [t('ATP:0000360', 'background information'), t('ATP:0000405', 'experimental data')],
  'ATP:0000404': [],
};

describe('fetchDataContextData', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((url) => {
      const [, curie, directOnly] = url.match(/search_descendants\/([^/]+)\/(true|false)\//);
      return Promise.resolve({ data: directOnly === 'true' ? CHILDREN[curie] || [] : ALL });
    });
  });

  test('drops the root-level grouping but offers a root-level leaf', async () => {
    const curies = (await fetchDataContextData()).map((o) => o.curie);
    expect(curies).not.toContain('ATP:0000324');
    expect(curies).toContain('ATP:0000404');
  });

  test('offers the deeper terms the MOD defaults use', async () => {
    const curies = (await fetchDataContextData()).map((o) => o.curie);
    expect(curies).toEqual(expect.arrayContaining(['ATP:0000405', 'ATP:0000406', 'ATP:0000360']));
  });

  test('falls back to the known list when the ontology call fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockRejectedValue(new Error('down'));
    const curies = (await fetchDataContextData()).map((o) => o.curie);
    expect(curies).toContain('ATP:0000405');
    expect(curies).toContain('ATP:0000404');
    expect(curies).not.toContain('ATP:0000325');
    console.error.mockRestore();
  });
});
