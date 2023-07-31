function extractPlaceID(url) {
    var match = url.match(/19s(.*?)\?/);
    if (match) {
        return match[1];
    } else {
        return null;
    }
}



module.exports = { extractPlaceID };