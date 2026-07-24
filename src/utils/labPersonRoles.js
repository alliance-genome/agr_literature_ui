// Mutual-exclusion rule for the person-lab role/status checkboxes, shared by the
// Person and Laboratory editors so the constraint lives in one place.
//
// Rules (only UNCHECKED boxes are disabled, so a checked box can always be
// un-selected to back out):
//   - is_pi is mutually exclusive with former_pi and with alum (bidirectional):
//     checking one disables the others; each exclusion is enforced both ways.
//   - former_pi and alum may coexist.
//   - alum is NOT blocked by is_lab_contact / can_edit_lab. Curators set alum
//     whenever they learn it and reconcile the contact/edit flags afterward, so
//     nothing about contact/edit may disable the alum box.
//   - Setting alum does still disable *adding* is_lab_contact / can_edit_lab in
//     the Laboratory editor (they read row.alum); an already-set one stays
//     checked and can be un-selected to clean it up. This one-directional gate
//     is intentional — do not "restore" an alum -> contact/edit symmetry, it
//     would re-block setting alum, which is exactly what this change removed.
//
// Note only the Laboratory editor renders the is_lab_contact / can_edit_lab
// boxes; the Person editor renders just the three role flags and no longer needs
// to carry those two fields (the alum case reads only is_pi).
export const roleFlagDisabled = (row, key) => {
  if (row[key]) return false;
  if (key === 'is_pi') return !!(row.former_pi || row.alum);
  if (key === 'former_pi') return !!row.is_pi;
  if (key === 'alum') return !!row.is_pi;
  if (key === 'is_lab_contact' || key === 'can_edit_lab') return !!row.alum;
  return false;
};
