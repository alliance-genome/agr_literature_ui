// Section definitions for the Person screen's layout settings.
//
// Mirrors personSections.js / laboratorySections.js: the curator arranges these in a
// 2D grid via SectionLayoutModal, hides the ones they do not want, and saves named
// arrangements. The geometry helpers are the generic ones from biblioEditorSections,
// so nothing here re-implements the grid.
//
// One namespace, not two. Person and Laboratory each keep separate Editor and Display
// layouts because those are two ways of looking at the same record; this screen is a
// single view, so there is nothing to keep apart.

import { LAYOUT_COLS, layoutToCssGrid } from './biblioEditorSections';

// Re-exported for the panel that builds its grid from these, matching how the person
// and laboratory modules relay them.
export { LAYOUT_COLS, layoutToCssGrid };

// componentName namespace for usePersonSettings / the /person_setting API. Distinct
// from person_*_layout and laboratory_*_layout, or one screen would load another's
// arrangement.
export const BIBLIO_PERSON_LAYOUT_COMPONENT_NAME = 'biblio_person_layout';

// The arrangeable sections, in their natural top-to-bottom order. The ids are both the
// layout keys and the keys of the panel's `sectionRows` bucket.
//
// The action header -- reference curie, workflow status, Commit, Back -- is absent on
// purpose. It stays fixed above the grid: a curator must never be able to hide or
// reorder the button that writes.
export const SECTION_DEFS = [
  { id: 'reference', label: 'Reference' },
  { id: 'unmatched', label: 'Unmatched people' },
  { id: 'authors', label: 'Authors' },
  { id: 'institutions', label: 'Institutions' },
];

/**
 * Section ids hidden by default for the given effective MOD. Nothing on this screen is
 * MOD-gated today, so this is always empty -- kept for parity with the person and
 * laboratory modules, where gating a section is a one-line change.
 */
export const defaultHiddenSections = (effectiveMod) =>
  new Set(
    SECTION_DEFS
      .filter((s) => Array.isArray(s.mods) && !s.mods.includes(effectiveMod))
      .map((s) => s.id),
  );

// Default arrangement: every section stacked full width, which is the layout the
// screen had before it was arrangeable. Author rows and institution editors both run
// the full width, so side by side squashes them -- the curator can still do it, but it
// should not be what they start from.
export const DEFAULT_LAYOUT = SECTION_DEFS.map((s, i) => ({
  i: s.id,
  x: 0,
  y: i,
  w: LAYOUT_COLS,
  h: 1,
}));
