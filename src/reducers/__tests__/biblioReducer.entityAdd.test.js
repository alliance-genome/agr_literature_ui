import biblioReducer from '../biblioReducer';

// SCRUM-6645: a 409 "tag already exists" response is shown in the TET
// editor's warning table, so it must not also pop up in the Entity Error modal.
describe('UPDATE_BUTTON_BIBLIO_ENTITY_ADD', () => {
  const pending = (count) => biblioReducer(undefined, { type: 'SET_BIBLIO_UPDATING_ENTITY_ADD', payload: count });

  test('a handled conflict decrements the counter without touching the modal text', () => {
    const next = biblioReducer(pending(2), {
      type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
      payload: {
        responseMessage: 'error: topic_entity_tag/ AxiosError: Request failed with status code 409',
        conflictHandled: true,
      },
    });
    expect(next.entityModalText).toBe('');
    expect(next.biblioUpdatingEntityAdd).toBe(1);
  });

  test('any other failure is still appended to the modal text', () => {
    const next = biblioReducer(pending(1), {
      type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
      payload: { responseMessage: 'error: topic_entity_tag/ AxiosError: Request failed with status code 500' },
    });
    expect(next.entityModalText).toContain('status code 500');
    expect(next.biblioUpdatingEntityAdd).toBe(0);
  });
});
