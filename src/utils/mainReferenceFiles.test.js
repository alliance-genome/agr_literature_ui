import { mainFilesForCurator } from './mainReferenceFiles';

const file = (over = {}) => ({
  referencefile_id: 1,
  file_class: 'main',
  display_name: 'WBPaper00069953',
  file_extension: 'pdf',
  referencefile_mods: [{ mod_abbreviation: 'WB' }],
  ...over,
});

describe('mainFilesForCurator', () => {
  test('keeps only main files', () => {
    // Supplements, figures and the additional-files tarball are a different ask; the
    // Person screen wants the paper itself.
    const files = [
      file({ referencefile_id: 1, file_class: 'main' }),
      file({ referencefile_id: 2, file_class: 'supplement' }),
      file({ referencefile_id: 3, file_class: 'figure' }),
    ];
    expect(mainFilesForCurator(files, { accessLevel: 'WB' }).map((f) => f.id)).toEqual([1]);
  });

  test('builds the filename from display_name and extension', () => {
    expect(mainFilesForCurator([file()], { accessLevel: 'WB' })[0].filename)
      .toBe('WBPaper00069953.pdf');
  });

  test('allows a file whose mod matches the curator', () => {
    expect(mainFilesForCurator([file()], { accessLevel: 'WB' })[0].allowed).toBe(true);
  });

  test('denies a file scoped to a different mod', () => {
    expect(mainFilesForCurator([file()], { accessLevel: 'SGD' })[0].allowed).toBe(false);
  });

  test('allows a file carrying a null mod_abbreviation to anyone', () => {
    const open = file({ referencefile_mods: [{ mod_abbreviation: null }] });
    expect(mainFilesForCurator([open], { accessLevel: 'SGD' })[0].allowed).toBe(true);
  });

  test('denies a file with no mod rows at all', () => {
    // The display tab starts is_ok = false and only flips it inside the loop, so an
    // empty referencefile_mods grants nothing there. Granting here instead would show
    // an enabled download on one screen and a permission tooltip on the other.
    const orphan = file({ referencefile_mods: [] });
    expect(mainFilesForCurator([orphan], { accessLevel: 'WB' })[0].allowed).toBe(false);
  });

  test('open access grants regardless of mod scoping', () => {
    expect(mainFilesForCurator([file()], { accessLevel: 'SGD', openAccess: true })[0].allowed)
      .toBe(true);
  });

  test('a developer is granted regardless of mod scoping', () => {
    expect(mainFilesForCurator([file()], { accessLevel: 'developer' })[0].allowed).toBe(true);
  });

  test('accessLevel "No" denies everything, open access included', () => {
    // The display tab forces is_ok = false for 'No' before it considers open access.
    expect(mainFilesForCurator([file()], { accessLevel: 'No', openAccess: true })[0].allowed)
      .toBe(false);
  });

  test('lists the mods that scope a denied file, without the nulls', () => {
    const scoped = file({
      referencefile_mods: [{ mod_abbreviation: 'WB' }, { mod_abbreviation: null }],
    });
    expect(mainFilesForCurator([scoped], { accessLevel: 'SGD' })[0].mods).toEqual(['WB']);
  });

  test('handles missing files, missing mod arrays and null entries', () => {
    expect(mainFilesForCurator(null, { accessLevel: 'WB' })).toEqual([]);
    expect(mainFilesForCurator(undefined, { accessLevel: 'WB' })).toEqual([]);
    expect(mainFilesForCurator([null], { accessLevel: 'WB' })).toEqual([]);
    const noMods = file({ referencefile_mods: undefined });
    expect(mainFilesForCurator([noMods], { accessLevel: 'WB' })[0].allowed).toBe(false);
  });
});
