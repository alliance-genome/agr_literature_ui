/** Helpers for default-species inference and species-label rendering used by
 *  the validation column / modals. */

/** Pick the default species taxon curie for a given MOD.
 *  - For single-taxon MODs (WB, ZFIN, SGD, FB, RGD, MGI) returns that taxon.
 *  - For multi-taxon MODs (e.g. XB) returns null — the curator picks.
 *  - Returns null when the mapping or MOD is unavailable. */
export function defaultSpeciesCurieForMod(modToTaxon, mod) {
  if (!modToTaxon || !mod) return null;
  const taxa = modToTaxon[mod];
  if (!Array.isArray(taxa) || taxa.length !== 1) return null;
  return taxa[0] || null;
}

/** Resolve a taxon curie to its display name using the redux mapping, with a
 *  graceful fallback to the curie itself. */
export function speciesName(curieToNameTaxon, curie) {
  if (!curie) return '';
  const name = curieToNameTaxon?.[curie];
  return name || curie;
}

/** First letter of the species name (uppercased), '?' for unknown names. */
export function speciesBadgeLetter(curieToNameTaxon, curie) {
  if (!curie) return '?';
  const name = curieToNameTaxon?.[curie];
  if (!name) return '?';
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}
