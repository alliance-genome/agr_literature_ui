import { OBSERVER_GROUP_TO_MOD, resolveCognitoRoles } from '../cognitoRoles';

describe('resolveCognitoRoles (SCRUM-6431)', () => {
  test('every MOD observer group resolves to a read-only role scoped to its MOD', () => {
    const expected = {
      SGDObserver: 'SGD', RGDObserver: 'RGD', MGIObserver: 'MGI',
      ZFINObserver: 'ZFIN', XenbaseObserver: 'XB',
      FlyBaseObserver: 'FB', WormBaseObserver: 'WB',
    };
    expect(OBSERVER_GROUP_TO_MOD).toEqual(expected);
    Object.entries(expected).forEach(([group, mod]) => {
      const roles = resolveCognitoRoles([group], 'prod');
      expect(roles).toEqual({ mod, isDeveloper: false, isTester: false, isObserver: true });
    });
  });

  test('observer groups never reach the prefix inference', () => {
    // Pre-fix behavior: FlyBaseObserver.startsWith('Fly') granted full FB
    // curator UI. It must resolve as observer, not a bare curator mod.
    const roles = resolveCognitoRoles(['FlyBaseObserver'], 'prod');
    expect(roles.isObserver).toBe(true);
    expect(roles.mod).toBe('FB');
  });

  test('observer-shaped groups outside the map FAIL CLOSED', () => {
    // A renamed/misspelled observer group, or an eighth MOD onboarded before
    // this map is updated, must never fall through to prefix inference and
    // become a curator — read-only with no MOD scope at worst (review finding).
    for (const group of ['SGD_Observer', 'ZfinObserver', 'XBObserver', 'EighthModObserver']) {
      const roles = resolveCognitoRoles([group], 'prod');
      expect(roles.isObserver).toBe(true);
      expect(roles.mod).toBe('No');
    }
    // Mapped + unmapped observer groups: the mapped one supplies the MOD.
    expect(resolveCognitoRoles(['XBObserver', 'FlyBaseObserver'], 'prod'))
      .toEqual({ mod: 'FB', isDeveloper: false, isTester: false, isObserver: true });
    // Unmapped observer group + curator: write-capable role still wins.
    expect(resolveCognitoRoles(['XBObserver', 'FlyBaseCurator'], 'prod').isObserver).toBe(false);
  });

  test('prototype-chain group names cannot poison the map lookup', () => {
    for (const group of ['constructor', 'toString', 'hasOwnProperty']) {
      const roles = resolveCognitoRoles([group], 'prod');
      expect(roles).toEqual({ mod: 'No', isDeveloper: false, isTester: false, isObserver: false });
    }
  });

  test('write-capable groups supersede observer membership', () => {
    expect(resolveCognitoRoles(['FlyBaseObserver', 'FlyBaseCurator'], 'prod'))
      .toEqual({ mod: 'FB', isDeveloper: false, isTester: false, isObserver: false });
    expect(resolveCognitoRoles(['FlyBaseObserver', 'FlyBaseDeveloper'], 'prod'))
      .toEqual({ mod: 'FB', isDeveloper: true, isTester: false, isObserver: false });
    const admin = resolveCognitoRoles(['SGDObserver', 'SuperAdmin'], 'prod');
    expect(admin.isObserver).toBe(false);
  });

  test('legacy curator/developer prefix inference is unchanged', () => {
    expect(resolveCognitoRoles(['FlyBaseCurator'], 'prod').mod).toBe('FB');
    expect(resolveCognitoRoles(['WormBaseCurator'], 'prod').mod).toBe('WB');
    expect(resolveCognitoRoles(['XenbaseCurator'], 'prod').mod).toBe('XB');
    expect(resolveCognitoRoles(['ZFINCurator'], 'prod').mod).toBe('ZFIN');
    const dev = resolveCognitoRoles(['MGIDeveloper'], 'prod');
    expect(dev).toEqual({ mod: 'MGI', isDeveloper: true, isTester: false, isObserver: false });
    // Unmapped groups still resolve to nothing, exactly as before.
    expect(resolveCognitoRoles(['FBStaff'], 'prod'))
      .toEqual({ mod: 'No', isDeveloper: false, isTester: false, isObserver: false });
    expect(resolveCognitoRoles([], 'prod').mod).toBe('No');
    expect(resolveCognitoRoles(null, 'prod').mod).toBe('No');
  });

  test('tester resolution matches the environment rules', () => {
    expect(resolveCognitoRoles(['Tester'], 'dev').isTester).toBe(true);
    expect(resolveCognitoRoles(['Tester'], 'prod').isTester).toBe(false);
    expect(resolveCognitoRoles(['POTester'], 'prod').isTester).toBe(true);
    expect(resolveCognitoRoles(['POTester'], 'dev').isTester).toBe(false);
  });
});
