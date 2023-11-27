/* THIS FILE IS OBSOLETE AS IT WAS USED FOR FOR A BRAIN.JS LSTM NETWORK */
const brain = require('brain.js');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const { minMaxScaler, getSensorIdByName, getRoomIdByType } = require('./utils.js');

const extremeValues = {};
const trainingData = [];

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

async function loadTrainingData() {
    const csvFiles = fs
        .readdirSync(process.env.PROCESSED_BYSENSOR_DATA_PATH)
        .filter((file) => file.startsWith('thingy'))
        .sort();

    const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const sensorsID = new Map();
    const roomtypesID = new Map();

    sheetData.forEach((row, index) => {
        sensorsID.set(row['Device ID'], index);
    });

    let nextID = 0;
    sheetData.forEach((row) => {
        const roomType = row['Room type'];
    
        if (!roomtypesID.has(roomType)) {
            roomtypesID.set(roomType, nextID);
            nextID++;
        }
    });

    for (const file of csvFiles) {
        const rdFilePath = path.join(process.env.PROCESSED_BYSENSOR_DATA_PATH, file);
        const parser = csv.parse({ headers: true });

        await new Promise((resolve, reject) => {
            const sensorName = file.replace(/\.csv$/, '');
            const sensorData = [];

            fs.createReadStream(rdFilePath)
                .pipe(parser)
                .on('data', (row) => {


                    const sensorReading = {
                        // hour: parseInt(row.hour),
                        // sensor: sensorsID.get(row.sensor),
                        eCO2: minMaxScaler(parseInt(row.eCO2), extremeValues[sensorName].eCO2.min, extremeValues[sensorName].eCO2.max),
                        sound: minMaxScaler(parseInt(row.sound), extremeValues[sensorName].sound.min, extremeValues[sensorName].sound.max),
                        light: minMaxScaler(parseInt(row.light), extremeValues[sensorName].light.min, extremeValues[sensorName].light.max),
                        day: parseInt(row.day),
                        // roomtype: roomtypesID.get(row.roomtype),
                    };
                    
                    sensorData.push(sensorReading);
                })
                .on('end', () => {
                    trainingData.push(sensorData);
                    resolve();
                })
                .on('error', reject);
        });
    }
}

findExtremeValues()
    .then(() => {
        // console.log(extremeValues);

        loadTrainingData()
            .then(() => {
                console.log('Loading of training data completed. Starting to train now.');
                let test = [];
                test.push(trainingData[0]);
                // test.push(trainingData[1]);

                const inLength = 6; // Number of hours in the input sequence
                const outLength = 3;   // Number of hours to predict

                const formattedData = [];
                
                test.forEach(arr => {
                    for (let i = 0; i <= arr.length - (inLength + outLength); i++) {
                        const input = arr.slice(i, i + inLength);
                        const output = arr.slice(i + inLength, i + inLength + outLength);
    
                        formattedData.push({ input, output });
                    }
                })


                console.log(formattedData);

                LSTMTrain(formattedData);
            })
            .catch((error) => {
                console.error('Error occured while loading training data:', error);
            });
    })

const LSTMTrain = (data) => {
    // const lstm = new brain.recurrent.LSTMTimeStep({});

    const crossValidate = new brain.CrossValidate(() => new brain.recurrent.LSTMTimeStep({}));

    // lstm.train(data, { iterations: 1000, learningRate: 0.001, log: true,  });
    crossValidate.train(data, { iterations: 1000, learningRate: 0.001, log: true})

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

    const modelFilePath = path.join(process.env.LSTM_MODELS_PATH, 'model.json');
    const netState = crossValidate.toJSON();
    fs.writeFileSync(modelFilePath, JSON.stringify(netState), 'utf8');

    const predictions = crossValidate.forecast(inputSequence, 3);

    console.log(predictions);
}