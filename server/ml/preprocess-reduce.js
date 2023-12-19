const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);

const csvFiles = fs
    .readdirSync(process.env.PROCESSED_AVG_DATA_PATH)
    .filter((file) => file.startsWith('sensors-thingy-'))
    .sort();

csvFiles.forEach((file) => {
    const rdFilePath = path.join(process.env.PROCESSED_AVG_DATA_PATH, file);
    const wrFilePath = path.join(process.env.PROCESSED_REM_DATA_PATH, file);
  
    const rdStream = fs.createReadStream(rdFilePath);
    const wrStream = fs.createWriteStream(wrFilePath);

    const parser = csv.parse({ headers: true });
    const wrCsvStream = csv.format({ headers: true });
    rdStream.pipe(parser);
    wrCsvStream.pipe(wrStream);

    let sensorData = [];
    let currentSensorId = '';

    parser.on('data', (row) => {
        const sensorId = row.sensor;
        if (sensorId !== currentSensorId) {
            if (currentSensorId && !hasMissingHours(sensorData[currentSensorId])) {
                sensorData[currentSensorId].forEach((r) => {
                    wrCsvStream.write(r);
                });
            }

            currentSensorId = sensorId;
            sensorData[currentSensorId] = [];
        }

        sensorData[currentSensorId].push(row);
    });

    parser.on('end', () => {
        if (currentSensorId && !hasMissingHours(sensorData[currentSensorId])) {
            sensorData[currentSensorId].forEach((r) => {
                wrCsvStream.write(r);
            });
        }
        wrCsvStream.end();
    });
});

const hasMissingHours = (data) => {
    const availableHours = new Set(data.map((row) => parseInt(row.hour)));
    for (let hour = 0; hour < 24; hour++) {
        if (!availableHours.has(hour)) {
            // console.log("found missing for:", data[0].sensor);
            return true;
        }
    }
    return false;
}