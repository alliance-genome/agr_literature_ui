// Hard-coded default species per (MOD, topic) for Quick Topic Addition
// (SCRUM-6168). The ticket asks for "a mapping of which default species is
// appropriate for each topic ... so needs to be hard-coded somewhere" — this is
// that place. Curators own these values.
//
// Only add a topic here when its default species differs from the MOD's primary
// taxon. Topics not listed fall back to the MOD default taxon (from
// /mod/taxons/all via defaultSpeciesCurieForMod), so most single-taxon MODs
// (FB → D. melanogaster, WB → C. elegans) need no entries at all.
//
// Format: { MOD_ABBR: { 'ATP:topicCurie': 'NCBITaxon:taxonCurie' } }
// Example:
//   FB: {
//     'ATP:0000123': 'NCBITaxon:7240',  // <topic name> -> Drosophila simulans
//   },
export const TOPIC_DEFAULT_TAXON = {
  FB: {},
  WB: {},
};

// Return the hard-coded default taxon curie for a (MOD, topic), or null when
// there is no per-topic override (caller should fall back to the MOD default).
export function topicDefaultTaxonCurie(mod, topicCurie) {
  if (!mod || !topicCurie) { return null; }
  return TOPIC_DEFAULT_TAXON[mod]?.[topicCurie] || null;
}
