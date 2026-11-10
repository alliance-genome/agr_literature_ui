// SCRUM-5697 / SCRUM-6815. The data_context a newly created tag should default to.
//
// The rule is per-MOD curation policy, which is the whole reason this lives in
// one place. ATP:0000325 "experimentally studied data" was deprecated in the
// 2026-10-30 ATP release and every MOD moved off it in one cutover:
//   FB   -- ATP:0000405 experimental data on everything (Gillian).
//   ZFIN -- ATP:0000405 on topic tags, ATP:0000406 on entities (Ceri).
//   WB   -- the same as ZFIN (Kimberly, 2026-11-10). WB topic tags used the
//           ATP:0000323 root before.
//   everyone else -- ATP:0000405.
//
// Matching the backfill is load-bearing rather than cosmetic:
// check_for_duplicate_tags on the server filters on every field of the payload,
// so a curator re-adding a tag that already exists only gets the expected 409
// when the data_context agrees with the stored row. Keep in step with
// DATA_CONTEXT_DEFAULTS on the server (topic_entity_tag_crud).
export const DATA_CONTEXT_EXPERIMENTAL_DATA = "ATP:0000405";
export const DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY = "ATP:0000406";

// [topic-only tag, tag with an entity]
export const DATA_CONTEXT_DEFAULTS = {
  WB: [DATA_CONTEXT_EXPERIMENTAL_DATA, DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY],
  FB: [DATA_CONTEXT_EXPERIMENTAL_DATA, DATA_CONTEXT_EXPERIMENTAL_DATA],
  ZFIN: [DATA_CONTEXT_EXPERIMENTAL_DATA, DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY],
};
const DATA_CONTEXT_DEFAULT_OTHER_MODS = [DATA_CONTEXT_EXPERIMENTAL_DATA, DATA_CONTEXT_EXPERIMENTAL_DATA];

export const defaultDataContext = (modAbbreviation, hasEntity) => {
  const [topicOnly, withEntity] =
    DATA_CONTEXT_DEFAULTS[modAbbreviation] || DATA_CONTEXT_DEFAULT_OTHER_MODS;
  return hasEntity ? withEntity : topicOnly;
};

// The data_context of a curator's topic-level assessment (the grid's assess
// buttons and the bulk validation modal); CURATOR_VALIDATION_DATA_CONTEXT on the
// server. ATP:0000405 for every MOD: it is the same term as the MODs' topic
// tags, it sits under the ATP:0000323 root that older WB topic tags carry, and
// ATP:0000406 entities sit under it, so one value validates them all.
export const CURATOR_VALIDATION_DATA_CONTEXT = DATA_CONTEXT_EXPERIMENTAL_DATA;

// SCRUM-6553. FB asked not to see the data context pulldown at all -- their
// tags uniformly take one value (ATP:0000405 since SCRUM-6815), so a choice is
// only a chance to diverge from it. Hiding the pulldown also means
// the saved value must ignore anything already in row state (an edited tag
// preloads its stored data_context) and always fall back to defaultDataContext.
export const hidesDataContextPulldown = (modAbbreviation) =>
  modAbbreviation === "FB";
