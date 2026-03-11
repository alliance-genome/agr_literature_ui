const fs = require('fs');
const path = require('path');

const versionData = {
    buildId: Date.now().toString()
};

const outputPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionData));

console.log(`Generated version.json with buildId: ${versionData.buildId}`);