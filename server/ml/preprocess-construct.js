const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const xlsx = require('xlsx');

const { calculateAverageLightLevel } = require('../utils/calc.js')

const csvFiles = fs
    .readdirSync(process.env.HIST_SENSOR_DATA_PATH)
    .filter((file) => file.startsWith('sensors-thingy-'))
    .sort();

const combineMessages = (type1, type2) => {
    return {
        time: type1.time,
        sensor: type1.sensor,
        eCO2: type1.eCO2,
        sound: type1.sound,
        light: calculateAverageLightLevel(type2.color_r, type2.color_g, type2.color_b, type2.color_c)
    };
};

const isType1Message = (message) => {
    return message.eCO2 && !message.color_r;
}

const isType2Message = (message) => {
    return !message.eCO2 && message.color_r;
}

const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const sensors = new Set();

for (const row of sheetData) {
    sensors.add(row['Device ID']);
}

csvFiles.forEach((file) => {
    const rdFilePath = path.join(process.env.HIST_SENSOR_DATA_PATH, file);
    const wrFilePath = path.join(process.env.PROCESSED_COMB_DATA_PATH, file);
  
    const rdStream = fs.createReadStream(rdFilePath);
    const wrStream = fs.createWriteStream(wrFilePath);

    const parser = csv.parse({ headers: true });
    const wrCsvStream = csv.format({ headers: true });
    rdStream.pipe(parser);
  
    const messageBuffer = new Map();
    const messageCountBuffer = new Map();

    for (const sensor of sensors) {
        messageCountBuffer.set(sensor, false);
    }

    parser.on('data', (row) => {
        if (isType1Message(row)) {
            messageBuffer.set(row.sensor, row);
        } else if (isType2Message(row) && messageBuffer.has(row.sensor)) {
            if (!messageCountBuffer.get(row.sensor)) {
                const completeMessage = combineMessages(messageBuffer.get(row.sensor), row);
                wrCsvStream.write(completeMessage);
            }
            
            messageBuffer.delete(row.sensor);
            messageCountBuffer.set(row.sensor, !messageCountBuffer.get(row.sensor));
        }
    });

    parser.on('end', () => {
        wrCsvStream.pipe(wrStream);
    });
});


