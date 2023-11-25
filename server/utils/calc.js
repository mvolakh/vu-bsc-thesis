function calculateAverageLightLevel(r, g, b, c) {
    return Math.round((parseInt(r) + parseInt(g) + parseInt(b) + parseInt(c)) / 4);
}

module.exports = { calculateAverageLightLevel };