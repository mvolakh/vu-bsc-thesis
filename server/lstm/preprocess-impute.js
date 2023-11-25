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

csvFiles.forEach((file) => {
    const rdFilePath = path.join(process.env.PROCESSED_AVG_DATA_PATH, file);
  
    const rdStream = fs.createReadStream(rdFilePath);
    const parser = csv.parse({ headers: true });

    const sensorData = [];

    parser.on('data', (row) => {
        const sensorReading = {
            hour: parseInt(row.hour),
            sensor: parseInt(row.sensor),
            eCO2: parseInt(row.eCO2),
            sound: parseInt(row.sound),
            light: parseInt(row.light),
            day: parseInt(row.day),
            roomtype: parseInt(row.roomtype),
        };

        sensorData.push(sensorReading);
    });

    parser.on('end', () => {
        trainingData.push(sensorData);
    });

    rdStream.pipe(parser);
});


