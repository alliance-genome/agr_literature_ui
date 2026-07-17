// src/components/laboratory/laboratoryEditorSections.js
//
// Shared definitions for the layout-driven Laboratory "Editor" tab. Mirrors
// personEditorSections.js: the editor lets the user arrange its card sections in
// a 2D grid (via LaboratoryEditorLayoutModal), hide individual sections, and
// toggle the per-field timestamp / curator metadata. The arrangement + visibility
// + toggles are persisted per-user under the `laboratory_editor_layout` component
// namespace.
//
// The grid geometry is identical to the BiblioEditor / PersonEditor layout
// feature, so we reuse its generic helpers rather than re-implementing them.

import {
  LAYOUT_COLS,
  layoutToCssGrid,
  columnFloorForLayout,
  maxColumnsPerRow,
} from '../biblio/biblioEditorSections';

export { LAYOUT_COLS, layoutToCssGrid, columnFloorForLayout, maxColumnsPerRow };

// componentName namespace used with usePersonSettings / the /person_setting API.
export const LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME = 'laboratory_editor_layout';

// The sections, in their natural (default) top-to-bottom order. The ids are both
// the layout keys and the keys of the editor's `sectionRows` bucket. Cross
// references sit last by default.
export const SECTION_DEFS = [
  { id: 'profile', label: 'Profile' },
  { id: 'address', label: 'Address' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'webpages', label: 'Webpages' },
  { id: 'emails', label: 'Emails' },
  { id: 'research', label: 'Research' },
  { id: 'allele_designations', label: 'Allele designations' },
  { id: 'lab_members', label: 'Lab members' },
  { id: 'cross_references', label: 'Cross references' },
];

/**
 * The set of section ids hidden by default for the given effective MOD. No
 * laboratory section is MOD-gated today, so this is always empty — kept for parity
 * with the Person editor and to make future MOD gating a one-line change.
 */
export const defaultHiddenSections = (effectiveMod) =>
  new Set(
    SECTION_DEFS
      .filter((s) => Array.isArray(s.mods) && !s.mods.includes(effectiveMod))
      .map((s) => s.id),
  );

// Default arrangement: sections stacked full-width, preserving the editor's
// original single-column appearance.
export const DEFAULT_LAYOUT = SECTION_DEFS.map((s, i) => ({
  i: s.id,
  x: 0,
  y: i,
  w: LAYOUT_COLS,
  h: 1,
}));
