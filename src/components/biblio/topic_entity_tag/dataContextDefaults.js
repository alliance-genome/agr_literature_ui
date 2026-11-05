// SCRUM-5697. The data_context a newly created tag should default to.
//
// The rule is per-MOD, not global, which is the whole reason this lives in one
// place. Ceri Van Slyke on SCRUM-5697 (2026-09-01) split WormBase by what the
// tag is: "For WB entities are always experimentally studied ATP:0000325 ...
// Topic tags should get the 'ATP:0000323 data context' value." Every other MOD
// is uniform -- FlyBase asked for ATP:0000325 on all of theirs (backfill rule
// 4), and the remaining MODs take the same blanket default (rule 5).
//
// Matching the backfill is load-bearing rather than cosmetic:
// check_for_duplicate_tags on the server filters on every field of the payload,
// so a curator re-adding a topic that already exists only gets the expected 409
// when the data_context agrees with the stored row. Default WB topic tags to
// ATP:0000325 and every one of them looks like a brand-new assertion instead.
//
// The server applies ATP:0000325 when a client sends nothing, so that is also
// the right fallback here whenever the MOD cannot be determined -- sending
// WB's term for an unknown MOD would be a guess, while ATP:0000325 is what
// would have been stored anyway.
//
// SCRUM-6815. ATP:0000325 was deprecated in the 2026-10-30 ATP release. Each MOD
// moves off it together with a backfill of its own tags:
//   FB   -- ATP:0000405 experimental data on everything (Gillian).
//   ZFIN -- ATP:0000406 experimentally studied entity on curator-added
//           entities, ATP:0000405 on topic tags (Ceri).
// The other MODs keep their SCRUM-5697 values until they answer. Keep in step
// with default_data_context_for_mod on the server.
export const DATA_CONTEXT_ROOT = "ATP:0000323";
export const DATA_CONTEXT_EXPERIMENTALLY_STUDIED = "ATP:0000325";
export const DATA_CONTEXT_EXPERIMENTAL_DATA = "ATP:0000405";
export const DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY = "ATP:0000406";

export const defaultDataContext = (modAbbreviation, hasEntity) => {
  if (modAbbreviation === "FB") return DATA_CONTEXT_EXPERIMENTAL_DATA;
  if (modAbbreviation === "ZFIN") {
    return hasEntity ? DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY : DATA_CONTEXT_EXPERIMENTAL_DATA;
  }
  if (modAbbreviation === "WB" && !hasEntity) return DATA_CONTEXT_ROOT;
  return DATA_CONTEXT_EXPERIMENTALLY_STUDIED;
};

// The data_context of a curator's topic-level assessment (the grid's assess
// buttons and the bulk validation modal); CURATOR_VALIDATION_DATA_CONTEXT on the
// server. ATP:0000405 for every MOD: a tag only validates tags whose data_context
// is in its own hierarchy, ATP:0000325 has no ancestors any more, and ATP:0000405
// sits under ATP:0000323, so it validates WB's root-term topic tags as well as
// FB's and ZFIN's ATP:0000405 classifier tags.
export const CURATOR_VALIDATION_DATA_CONTEXT = DATA_CONTEXT_EXPERIMENTAL_DATA;

// SCRUM-6553. FB asked not to see the data context pulldown at all -- their
// tags uniformly take one value (ATP:0000405 since SCRUM-6815), so a choice is
// only a chance to diverge from it. Hiding the pulldown also means
// the saved value must ignore anything already in row state (an edited tag
// preloads its stored data_context) and always fall back to defaultDataContext.
export const hidesDataContextPulldown = (modAbbreviation) =>
  modAbbreviation === "FB";
