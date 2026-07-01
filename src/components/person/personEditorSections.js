// src/components/person/personEditorSections.js
//
// Shared definitions for the layout-driven Person "Editor" tab.
//
// The editor mirrors the WB editor's ten card sections, but lets the user
// arrange those sections in a 2D grid (via PersonEditorLayoutModal), hide
// individual sections, and toggle the per-field timestamp / curator metadata.
// The arrangement + visibility + toggles are persisted per-user under the
// `person_editor_layout` component namespace.
//
// The grid geometry is identical to the BiblioEditor layout feature, so we reuse
// its generic helpers (layoutToCssGrid / columnFloorForLayout / maxColumnsPerRow)
// rather than re-implementing them here.

import {
  LAYOUT_COLS,
  layoutToCssGrid,
  columnFloorForLayout,
  maxColumnsPerRow,
} from '../biblio/biblioEditorSections';

export { LAYOUT_COLS, layoutToCssGrid, columnFloorForLayout, maxColumnsPerRow };

// componentName namespace used with usePersonSettings / the /person_setting API.
export const PERSON_EDITOR_LAYOUT_COMPONENT_NAME = 'person_editor_layout';

// The sections, in their natural (default) top-to-bottom order. The ids are used
// both as react-grid-layout keys and as the keys of the editor's `sectionRows`
// bucket; the labels appear on the canvas boxes and the checklist.
//
// An optional `mods` array gates a section's DEFAULT visibility to specific MOD
// abbreviations (effective MOD = testerMod, else cognitoMod): the section is shown
// by default only for those MODs and hidden by default for everyone else. It is
// still listed in the Settings checklist, so any curator can enable it, and a
// loaded/saved setting takes precedence over the default. Sections without `mods`
// are shown by default for all MODs.
export const SECTION_DEFS = [
  { id: 'profile', label: 'Profile' },
  { id: 'names', label: 'Names' },
  { id: 'email', label: 'Email' },
  { id: 'address', label: 'Address' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'webpages', label: 'Webpages' },
  { id: 'laboratories', label: 'Laboratories' },
  { id: 'cross_references', label: 'Cross references' },
  { id: 'research_interest', label: 'Research interest' },
  { id: 'comments', label: 'Comments' },
  { id: 'lineage', label: 'Lineage', mods: ['WB'] },
];

/**
 * The set of section ids hidden by default for the given effective MOD: every
 * section whose `mods` gate excludes that MOD. Sections without a `mods` gate are
 * never in the set (shown for all). Used as the editor's initial visibility and as
 * the reactive default when the MOD changes (until the user/a saved setting makes
 * an explicit choice).
 */
export const defaultHiddenSections = (effectiveMod) =>
  new Set(
    SECTION_DEFS
      .filter((s) => Array.isArray(s.mods) && !s.mods.includes(effectiveMod))
      .map((s) => s.id),
  );

// Default arrangement: the ten sections stacked full-width, preserving the
// editor's original single-column appearance. Used when the user has no saved
// layout, and as the starting canvas state in the preference modal.
//
// Heights are intentionally one row each so the modal canvas stays compact (with
// ten sections, taller boxes make the canvas scroll a lot). The editor itself
// ignores `h` — sections are laid out by column position with auto-sized rows —
// so the canvas height carries no real meaning beyond the schematic.
export const DEFAULT_LAYOUT = SECTION_DEFS.map((s, i) => ({
  i: s.id,
  x: 0,
  y: i,
  w: LAYOUT_COLS,
  h: 1,
}));
