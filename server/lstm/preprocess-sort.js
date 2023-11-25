const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require('dotenv-expand').expand(dotenv);
const xlsx = require('xlsx');

const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const sensorsNames = new Map();

sheetData.forEach((row, index) => {
    sensorsNames.set(index, row['Device ID']);
});

async function processCSVFiles() {
    const csvFiles = fs
        .readdirSync(process.env.PROCESSED_AUG_DATA_PATH)
        .filter((file) => file.startsWith('sensors-thingy-'))
        .sort();

    // Create an object to store data for each sensor
    const sensorData = {};

    // Read and store data for each sensor from all input files
    for (const file of csvFiles) {
        const rdFilePath = path.join(process.env.PROCESSED_AUG_DATA_PATH, file);
        const parser = csv.parse({ headers: true });

        await new Promise((resolve, reject) => {
            fs.createReadStream(rdFilePath)
                .pipe(parser)
                .on('data', (row) => {
                    const sensorId = row.sensor;

                    if (!sensorData[sensorId]) {
                        sensorData[sensorId] = [];
                    }

                    sensorData[sensorId].push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
    }

    // Create a separate file for each sensor and write the data for that sensor
    for (const sensorId in sensorData) {
        if (sensorData.hasOwnProperty(sensorId)) {
            const sensorOutputFile = `${sensorId}.csv`;
            const wrFilePath = path.join(process.env.PROCESSED_BYSENSOR_DATA_PATH, sensorOutputFile);

            const wrStream = fs.createWriteStream(wrFilePath);
            const wrCsvStream = csv.format({ headers: true });

            wrCsvStream.pipe(wrStream);

            sensorData[sensorId].forEach((row) => {
                wrCsvStream.write(row);
            });

            wrCsvStream.end();
        }
    }
}

processCSVFiles()
    .then(() => {
        console.log('Processing completed.');
    })
    .catch((error) => {
        console.error('Error:', error);
    });