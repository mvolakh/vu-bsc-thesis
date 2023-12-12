const brain = require('brain.js');
const csv = require('fast-csv');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const timeToNumeric = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
  
    const minutesSinceMidnight = hours * 60 + minutes;
    
    console.log("minutesSinceMidnight", minutesSinceMidnight)
    return minutesSinceMidnight;
}

function minMaxScaler(val, min, max) {
    return (val - min) / (max - min);
}

function minMaxScalerInv(val, min, max) {
    return val * (max - min) + min;
}

function getSensorIdByName(data, name) {
    const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const sensorsID = new Map();

    sheetData.forEach((row, index) => {
        sensorsID.set(row['Device ID'], index);
    });

    sensorsID.get(name);
}

function getRoomIdByType(type) {
    const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const roomtypesID = new Map();
    
    let nextID = 0;
    sheetData.forEach((row) => {
        const roomType = row['Room type'];
    
        if (!roomtypesID.has(roomType)) {
            roomtypesID.set(roomType, nextID);
            nextID++;
        }
    });

    return roomtypesID.get(type);
}


module.exports = { timeToNumeric, minMaxScaler, minMaxScalerInv, getSensorIdByName, getRoomIdByType };