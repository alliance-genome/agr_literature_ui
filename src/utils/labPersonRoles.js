// Mutual-exclusion rule for the person-lab role/status checkboxes, shared by the
// Person and Laboratory editors so the constraint lives in one place.
//
// The exclusions must be enforced BIDIRECTIONALLY (each side disables the other),
// because only UNCHECKED boxes are disabled — a one-way rule would let the
// forbidden state be reached by checking the boxes in the permissive order:
//   - is_pi is mutually exclusive with former_pi and with alum
//   - former_pi and alum may coexist
//   - alum is mutually exclusive with is_lab_contact and can_edit_lab
//
// Since a checked box is never disabled, a curator can always un-select a flag
// that is set — including one leg of a pre-existing invalid combination (e.g. a
// row that already had alum + is_lab_contact set directly via the API), which is
// resolved by unchecking either box. (The Person editor renders only the three
// role flags; the is_lab_contact / can_edit_lab cases apply to the Laboratory
// editor's lab-member rows.)
export const roleFlagDisabled = (row, key) => {
  if (row[key]) return false;
  if (key === 'is_pi') return !!(row.former_pi || row.alum);
  if (key === 'former_pi') return !!row.is_pi;
  if (key === 'alum') return !!(row.is_pi || row.is_lab_contact || row.can_edit_lab);
  if (key === 'is_lab_contact' || key === 'can_edit_lab') return !!row.alum;
  return false;
};
