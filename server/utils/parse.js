function getHourFromTimeString(timeString) {
    const [date, time] = timeString.split('_');
    const hour = parseInt(time.split(':')[0], 10);
    
    return hour;
}

module.exports = { getHourFromTimeString }