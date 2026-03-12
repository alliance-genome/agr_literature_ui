const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let gitHash = '';
try {
    gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
    // git may not be available in all build environments
}

const versionData = {
    buildId: gitHash ? `${Date.now()}-${gitHash}` : Date.now().toString()
};

const outputPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionData));

console.log(`Generated version.json with buildId: ${versionData.buildId}`);