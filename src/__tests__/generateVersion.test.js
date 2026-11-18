// Tests for scripts/generate-version.js (SCRUM-6878)
const { buildVersionData, resolveCommit } = require('../../scripts/generate-version');

const NOW = new Date('2026-11-18T13:45:07.123Z');
const gitSays = (sha) => () => `${sha}\n`;
const gitFails = () => { throw new Error('not a git repository'); };

test('takes the commit from git when GIT_SHA is not set', () => {
    expect(resolveCommit({}, gitSays('8f1ba410'))).toBe('8f1ba410');
});

test('GIT_SHA wins over git', () => {
    expect(resolveCommit({ GIT_SHA: '8f1ba410-dirty' }, gitSays('12345678'))).toBe('8f1ba410-dirty');
});

test('a blank or "unknown" GIT_SHA falls back to git', () => {
    expect(resolveCommit({ GIT_SHA: '' }, gitSays('8f1ba410'))).toBe('8f1ba410');
    expect(resolveCommit({ GIT_SHA: 'unknown' }, gitSays('8f1ba410'))).toBe('8f1ba410');
});

test('is unknown when git is unavailable', () => {
    expect(resolveCommit({}, gitFails)).toBe('unknown');
});

test('version.json keeps buildId for the new-version banner and adds commit and buildDate', () => {
    expect(buildVersionData({}, NOW, gitSays('8f1ba410'))).toEqual({
        buildId: String(NOW.getTime()),
        commit: '8f1ba410',
        buildDate: '2026-11-18T13:45:07Z',
    });
});
