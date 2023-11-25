/* THIS FILE IS OBSOLETE AS IT WAS USED FOR PREPROCESSING DATA FOR A BRAIN.JS LSTM NETWORK */
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const xlsx = require('xlsx');

const csvFiles = fs
    .readdirSync(process.env.PROCESSED_AUG_DATA_PATH)
    .filter((file) => file.startsWith('sensors-thingy-'))
    .sort();

const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const sensorsID = new Map();
const roomtypesID = new Map();

// for (const row of sheetData) {
//     sensorNormID.set(row['Device ID'], row['Room type']);
// }

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

csvFiles.forEach((file) => {
    const rdFilePath = path.join(process.env.PROCESSED_AUG_DATA_PATH, file);
    const wrFilePath = path.join(process.env.PROCESSED_NORM_DATA_PATH, file);
  
    const rdStream = fs.createReadStream(rdFilePath);
    const wrStream = fs.createWriteStream(wrFilePath);

    const parser = csv.parse({ headers: true });
    const wrCsvStream = csv.format({ headers: true });
    rdStream.pipe(parser);
    wrCsvStream.pipe(wrStream);

    parser.on('data', (row) => {
        row.eCO2 = normalizeECO2(row.eCO2);
        row.sound = normalizeSound(row.sound);
        row.light = normalizeLight(row.light);
        row.sensor = normalizeSensor(row.sensor);
        row.roomtype = normalizeRoomType(row.roomtype);

        wrCsvStream.write(row);
    });

    parser.on('end', () => {
        // wrCsvStream.pipe(wrStream);
        wrCsvStream.end();
    });
});

function normalizeECO2(val) {
    // min-max normalization
    const min = 0, max = 0;
    newValue = minMaxScaler(val, min, max)

    // // z-score normalization
    // const standardDeviation = 1;
    // const mean = 750;
    // const standardizedValue = (val - mean) / standardDeviation

    // // log normalization
    // const logValue = Math.log(value);

    // // box-cox normaliztion 
    // const lambda = 1;
    // const transformedValue = (Math.pow(val, lambda) - 1) / lambda;

    return newValue;
}
  
function normalizeSound(val) {
    return val;
}

function normalizeLight(val) {
    return val;
}

function normalizeSensor(val) {
    return sensorsID.get(val);
}

function normalizeRoomType(val) {
    return roomtypesID.get(val);
}

function minMaxScaler(val, min, max) {
    return (val - min) / (max - min);
}
