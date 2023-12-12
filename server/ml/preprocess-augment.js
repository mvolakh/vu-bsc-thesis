const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const xlsx = require('xlsx');

const csvFiles = fs
    .readdirSync(process.env.PROCESSED_REM_DATA_PATH)
    .filter((file) => file.startsWith('sensors-thingy-'))
    .sort();

const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const roomTypeBySensor = new Map();

for (const row of sheetData) {
    roomTypeBySensor.set(row['Device ID'], row['Room type']);
}

csvFiles.forEach((file) => {
    const rdFilePath = path.join(process.env.PROCESSED_REM_DATA_PATH, file);
    const wrFilePath = path.join(process.env.PROCESSED_AUG_DATA_PATH, file);
  
    const rdStream = fs.createReadStream(rdFilePath);
    const wrStream = fs.createWriteStream(wrFilePath);

    const parser = csv.parse({ headers: true });
    const wrCsvStream = csv.format({ headers: true });
    rdStream.pipe(parser);
    wrCsvStream.pipe(wrStream);

    const day = getDayOfWeekFromFilename(file);

    parser.on('data', (row) => {
        row.day = day;
        row.roomtype = roomTypeBySensor.get(row.sensor);

        wrCsvStream.write(row);
    });

    parser.on('end', () => {
        wrCsvStream.end();
    });
});

function getDayOfWeekFromFilename(file) {
    const dateRegex = /(\d{4})-(\d{2})-(\d{2})/.exec(file);
    if (dateRegex) {
        const year = parseInt(dateRegex[1], 10);
        const month = parseInt(dateRegex[2], 10) - 1;
        const day = parseInt(dateRegex[3], 10);

        return new Date(year, month, day).getDay();
    }
  }