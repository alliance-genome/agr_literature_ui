// src/components/laboratory/laboratorySections.js
//
// Shared section definitions for BOTH layout-driven Laboratory tabs -- "Display"
// and "Editor". Mirrors personSections.js: each tab lets the user arrange these
// sections in a 2D grid (via SectionLayoutModal), hide individual sections, and
// toggle the per-field timestamp / curator metadata. The two tabs share this
// list so the settings checklist reads identically in each, but persist to
// SEPARATE namespaces -- a curator's reading arrangement is independent of their
// editing arrangement.
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

// componentName namespaces used with usePersonSettings / the /person_setting API.
// Separate per tab: arranging the Editor must not disturb the Display.
export const LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME = 'laboratory_editor_layout';
export const LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME = 'laboratory_display_layout';

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
