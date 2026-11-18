// Writes public/version.json before every production build (npm "prebuild").
// buildId drives the new-version banner (useVersionCheck); commit and buildDate say which code
// is running (SCRUM-6878): curl <ui>/version.json, or the Login menu.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UNKNOWN = 'unknown';

// GIT_SHA (a build argument) wins when set; otherwise ask git about the checkout being built.
function resolveCommit(env, runGit) {
    const fromEnv = (env.GIT_SHA || '').trim();
    if (fromEnv && fromEnv !== UNKNOWN) {
        return fromEnv;
    }
    try {
        return runGit('git rev-parse --short=8 HEAD').trim() || UNKNOWN;
    } catch (error) {
        return UNKNOWN;
    }
}

function buildVersionData(env, now, runGit) {
    return {
        buildId: now.getTime().toString(),
        commit: resolveCommit(env, runGit),
        buildDate: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
}

function runGitQuietly(command) {
    return execSync(command, { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString();
}

if (require.main === module) {
    const versionData = buildVersionData(process.env, new Date(), runGitQuietly);
    const outputPath = path.join(__dirname, '..', 'public', 'version.json');
    fs.writeFileSync(outputPath, JSON.stringify(versionData));
    console.log(`Generated version.json with buildId: ${versionData.buildId}, commit: ${versionData.commit}`);
}

module.exports = { buildVersionData, resolveCommit, UNKNOWN };
