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
export const DATA_CONTEXT_ROOT = "ATP:0000323";
export const DATA_CONTEXT_EXPERIMENTALLY_STUDIED = "ATP:0000325";

export const defaultDataContext = (modAbbreviation, hasEntity) =>
  modAbbreviation === "WB" && !hasEntity
    ? DATA_CONTEXT_ROOT
    : DATA_CONTEXT_EXPERIMENTALLY_STUDIED;
