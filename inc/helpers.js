const fs = require('fs');

function extractPlaceID(url) {
    var match = url.match(/19s(.*?)\?/);
    if (match) {
        return match[1];
    } else {
        return null;
    }
}

async function writeToFile(filename, content) {
    try {
        await fs.promises.appendFile(filename, content);
        console.log(`Successfully wrote data to ${filename}`);
    } catch (error) {
        console.error(`Error writing to file ${filename}:`, error);
    }
}

module.exports = { extractPlaceID, writeToFile };