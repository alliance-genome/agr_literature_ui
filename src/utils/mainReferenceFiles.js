// The reference's main PDFs, and whether this curator may download each one.
//
// Extracted and tested because the rule is subtle and there is a second copy of it:
// RowDisplayReferencefiles in Biblio.js decides the same thing for the display tab.
// The two silently disagreed once already -- this version granted access to a file
// with no referencefile_mods rows, where the display tab denies it -- and a
// disagreement shows up as an enabled download on one screen and a permission tooltip
// on the other. Pinning it here at least makes the next divergence fail a test.
//
// Only the main-PDF half of the display tab's predicate is reproduced: its figure /
// canDisplayImages branch and its tarball handling do not apply to file_class 'main'.

/**
 * @param {Array} referenceFiles  state.biblio.referenceFiles
 * @param {{accessLevel: string, openAccess: boolean}} viewer
 * @returns {Array<{id, filename, allowed, mods}>} main files in the order given
 */
export const mainFilesForCurator = (referenceFiles, { accessLevel, openAccess } = {}) => {
  if (!Array.isArray(referenceFiles)) return [];

  return referenceFiles
    .filter((file) => file && file.file_class === 'main')
    .map((file) => {
      const mods = (Array.isArray(file.referencefile_mods) ? file.referencefile_mods : [])
        .map((rfm) => (rfm ? rfm.mod_abbreviation : undefined));

      // No length check: an empty mod list grants nothing, matching the display tab,
      // whose is_ok starts false and is only ever flipped true inside the loop over
      // referencefile_mods. A file with no rows simply never reaches that flip.
      const modAllows = mods.some((mod) => mod === null || mod === accessLevel);

      // 'No' is checked first and overrides everything, exactly as the display tab
      // does before it considers open access -- so a logged-out viewer is refused even
      // an open-access paper.
      const allowed = accessLevel !== 'No' && (
        modAllows
        || openAccess === true
        || accessLevel === 'developer'
      );

      return {
        id: file.referencefile_id,
        filename: `${file.display_name}.${file.file_extension}`,
        allowed,
        // For telling a curator which mods a file they cannot take is scoped to; the
        // nulls are the "anyone" marker, not a mod name.
        mods: mods.filter(Boolean),
      };
    });
};
