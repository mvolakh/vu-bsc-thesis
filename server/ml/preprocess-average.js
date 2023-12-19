const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);

const { getHourFromTimeString } = require('../utils/parse.js')

const csvFiles = fs
    .readdirSync(process.env.PROCESSED_COMB_DATA_PATH)
    .filter((file) => file.startsWith('sensors-thingy-'))
    .sort();

csvFiles.forEach((file) => {
    const sensorData = new Map();
    
    const rdFilePath = path.join(process.env.PROCESSED_COMB_DATA_PATH, file);
    const rdStream = fs.createReadStream(rdFilePath);

    const parser = csv.parse({ headers: true });
    rdStream.pipe(parser);
  
    parser.on('data', (row) => {
        const hour = getHourFromTimeString(row.time);
    
        if (!sensorData.has(row.sensor)) {
            sensorData.set(row.sensor, Array.from({ length: 24 }, () => ({ eCO2: 0, sound: 0, light: 0, count: 0 })));
        }

        const currSensorData = sensorData.get(row.sensor);

        // console.log(sensorHourData);

        currSensorData[hour].eCO2 += parseInt(row.eCO2);
        currSensorData[hour].sound += parseInt(row.sound);
        currSensorData[hour].light += parseInt(row.light);
        currSensorData[hour].count++;

        sensorData.set(row.sensor, currSensorData);
    });

    parser.on('end', () => {
        // console.log(sensorData)
        const wrFilePath = path.join(process.env.PROCESSED_AVG_DATA_PATH, file);
        const wrStream = fs.createWriteStream(wrFilePath);
        const wrCsvStream = csv.format({ headers: true });
        wrCsvStream.pipe(wrStream);

        sensorData.forEach((hourlyData, sensor) => {
            hourlyData.forEach((hourData, hour) => {
                if (hourData.count > 0) {
                    const averagedData = {
                        hour,
                        sensor,
                        eCO2: Math.round(hourData.eCO2 / hourData.count),
                        sound: Math.round(hourData.sound / hourData.count),
                        light: Math.round(hourData.light / hourData.count),
                    };

                    wrCsvStream.write(averagedData);
                }
            });
        });
    });
});

