/* THIS FILE IS OBSOLETE AS IT WAS USED FOR FOR A BRAIN.JS LSTM NETWORK */
const brain = require('brain.js');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const fs = require('fs');
const path = require('path');

const { minMaxScaler } = require('./utils.js');

const modelFilePath = path.join(process.env.LSTM_MODELS_PATH, 'model.json');
const savedModel = JSON.parse(fs.readFileSync(modelFilePath, 'utf8'));

const lstm = new brain.recurrent.LSTMTimeStep();
lstm.fromJSON(savedModel);

const extremeValues = {};

async function findExtremeValues() {
    const csvFiles = fs
        .readdirSync(process.env.PROCESSED_BYSENSOR_DATA_PATH)
        .filter((file) => file.startsWith('thingy'))
        .sort();

    for (const file of csvFiles) {
        const rdFilePath = path.join(process.env.PROCESSED_BYSENSOR_DATA_PATH, file);
        const parser = csv.parse({ headers: true });

        await new Promise((resolve, reject) => {
            const sensorId = file.replace(/\.csv$/, '');

            extremeValues[sensorId] = {
                eCO2: { min: Infinity, max: -Infinity },
                sound: { min: Infinity, max: -Infinity },
                light: { min: Infinity, max: -Infinity },
            };

            fs.createReadStream(rdFilePath)
                .pipe(parser)
                .on('data', (row) => {
                    const metrics = ['eCO2', 'sound', 'light'];
                    metrics.forEach((metric) => {
                        const val = parseInt(row[metric]);
                        extremeValues[sensorId][metric].min = Math.min(extremeValues[sensorId][metric].min, val);
                        extremeValues[sensorId][metric].max = Math.max(extremeValues[sensorId][metric].max, val);
                    });
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', reject);
        });
    }
}

findExtremeValues()
    .then(() => {
        const inputSequence = [
            { 
                hour: 5, 
                eCO2: minMaxScaler(855, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(198, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(0, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
            { 
                hour: 6, 
                eCO2: minMaxScaler(865, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(202, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(3, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
            { 
                hour: 7, 
                eCO2: minMaxScaler(738, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(196, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(105, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
            { 
                hour: 8, 
                eCO2: minMaxScaler(652, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(189, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(143, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
            { 
                hour: 9, 
                eCO2: minMaxScaler(610, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(203, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(179, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
            { 
                hour: 10, 
                eCO2: minMaxScaler(938, extremeValues['thingy001'].eCO2.min, extremeValues['thingy001'].eCO2.max), 
                sound: minMaxScaler(199, extremeValues['thingy001'].sound.min, extremeValues['thingy001'].sound.max), 
                light: minMaxScaler(202, extremeValues['thingy001'].light.min, extremeValues['thingy001'].light.max), 
                day: 1
            },
        ];

        console.log("input:", inputSequence);

        const predictions = lstm.forecast(inputSequence, 3);
        console.log("output:",predictions);
    })