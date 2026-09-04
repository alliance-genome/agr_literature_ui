// Explicit Cognito group -> role/MOD resolution (SCRUM-6431).
//
// Historically the SIGN_IN reducer inferred MOD affiliation from group-name
// prefixes (startsWith('Fly') -> FB, ...), which would silently grant the new
// read-only <Mod>Observer groups (SCRUM-6429) the full curator UI. Observer
// groups are resolved through the explicit mapping below and NEVER through
// prefix inference; the legacy prefix inference is retained for the
// curator/developer/staff groups it has always served, so existing roles are
// unchanged.
//
// Mirrors the server-side policy (agr_literature_service api/observer.py):
// a user is an observer only when they carry an observer group and NO
// write-capable group — any curator/developer/admin group supersedes observer
// membership. The observer's cognitoMod is their sponsoring MOD, so search
// corpus scoping and MOD-restricted full-text downloads work, while the
// isObserver flag hides every curation/mutation interface. The API enforces
// read-only independently (403 on mutating requests), so UI hiding is a
// convenience, not the security boundary.

export const OBSERVER_GROUP_TO_MOD = {
  SGDObserver: 'SGD',
  RGDObserver: 'RGD',
  MGIObserver: 'MGI',
  ZFINObserver: 'ZFIN',
  XenbaseObserver: 'XB',
  FlyBaseObserver: 'FB',
  WormBaseObserver: 'WB',
};

// Groups that carry write-capable or elevated access; their presence means the
// user is NOT an observer regardless of observer-group membership.
const ADMIN_GROUPS = ['SuperAdmin', 'AdminGroup', 'AllianceDeveloper'];

// The legacy prefix inference, unchanged, applied only to non-observer groups.
const MOD_PREFIXES = [
  ['SGD', 'SGD'], ['RGD', 'RGD'], ['MGI', 'MGI'], ['ZFIN', 'ZFIN'],
  ['Xen', 'XB'], ['Fly', 'FB'], ['Worm', 'WB'],
];

const prefixMod = (group) => {
  for (const [prefix, mod] of MOD_PREFIXES) {
    if (group.startsWith(prefix)) { return mod; }
  }
  return null;
};

// Structural observer detection: ANY group ending in 'Observer' is treated as
// an observer group and excluded from prefix inference, whether or not it is
// in the explicit map. The map only supplies the sponsoring MOD; an
// observer-shaped group we don't recognize (a renamed group, an eighth MOD
// onboarded before this list is updated) FAILS CLOSED — read-only with no MOD
// scope — instead of falling through to prefix inference and getting the full
// curator UI (SCRUM-6431 review).
const isObserverGroup = (group) => group.endsWith('Observer');

// Guarded lookup: `group in map` walks the prototype chain (a group literally
// named "constructor" would resolve to a function).
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Resolve Cognito groups into the UI's role state.
 *
 * @param {string[]} groups - the token's cognito:groups claim
 * @param {string} devOrStageOrProd - REACT_APP_DEV_OR_STAGE_OR_PROD
 * @returns {{ mod: string, isDeveloper: boolean, isTester: boolean,
 *             isObserver: boolean }}
 *   mod: MOD abbreviation or 'No'. For an observer this is the sponsoring MOD
 *   (content scope); isObserver distinguishes it from write-capable roles.
 */
export function resolveCognitoRoles(groups, devOrStageOrProd) {
  const groupList = groups || [];
  let mod = 'No';
  let isDeveloper = false;
  let isTester = false;
  let observerSeen = false;
  let observerMod = null;
  let hasWriteCapableGroup = false;

  for (const group of groupList) {
    if (isObserverGroup(group)) {
      // Observer-shaped groups never reach prefix inference. The MOD comes
      // only from the explicit map; unmapped ones stay read-only, un-scoped.
      observerSeen = true;
      if (observerMod === null && hasOwn(OBSERVER_GROUP_TO_MOD, group)) {
        observerMod = OBSERVER_GROUP_TO_MOD[group];
      }
      continue;
    }
    if (group.endsWith('Developer')) { isDeveloper = true; }
    if (group === 'Tester' && devOrStageOrProd !== 'prod') { isTester = true; }
    else if (group === 'POTester' && devOrStageOrProd === 'prod') { isTester = true; }
    if (ADMIN_GROUPS.includes(group)) { hasWriteCapableGroup = true; }
    const inferred = prefixMod(group);
    if (inferred) {
      mod = inferred;
      hasWriteCapableGroup = true;
    }
  }

  const isObserver = observerSeen && !hasWriteCapableGroup && !isDeveloper;
  if (isObserver && observerMod !== null) { mod = observerMod; }
  return { mod, isDeveloper, isTester, isObserver };
}
