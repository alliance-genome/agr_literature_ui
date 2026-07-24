// Mutual-exclusion rule for the person-lab role/status checkboxes, shared by the
// Person and Laboratory editors so the constraint lives in one place.
//
// is_pi excludes both former_pi and alum (and vice-versa); former_pi and alum may
// coexist; an alum additionally disables is_lab_contact and can_edit_lab
// (everything but former_pi). Only unchecked boxes are disabled, so a curator can
// always un-select a flag that is set. (The Person editor renders only the three
// role flags; the is_lab_contact / can_edit_lab cases apply to the Laboratory
// editor's lab-member rows.)
export const roleFlagDisabled = (row, key) => {
  if (row[key]) return false;
  if (key === 'is_pi') return !!(row.former_pi || row.alum);
  if (key === 'former_pi') return !!row.is_pi;
  if (key === 'alum') return !!row.is_pi;
  if (key === 'is_lab_contact' || key === 'can_edit_lab') return !!row.alum;
  return false;
};
