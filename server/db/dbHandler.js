const mongoose = require('mongoose');
const colors = require('colors');
const xlsx = require('xlsx');

const Room = require('./models/Room')

const dbOptions = {
    useNewUrlParser: true, 
    useUnifiedTopology: true
};

const connect = () => {
    mongoose.connect(process.env.DB_URI, dbOptions)
        .then(() =>  {
            console.log(`[DB] ${colors.green(`Connected to the DB`)}`);
            initRooms()
        })
        .catch((err) => console.log(`[DB] ${colors.red(`Error while connecting to the DB: ${err}`)}`));
};

async function initRooms() {
    try {
        const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        for (const row of sheetData) {
            const roomNumber = row['Room Number'];
            const deviceID = row['Device ID'];
            const floorRegex = roomNumber.match(/NU-(\d+)/);
            const floorNumber = floorRegex ? parseInt(floorRegex[1]) : null;
      
            if (roomNumber && deviceID && floorNumber !== null) {
                await Room.updateOne(
                  { name: roomNumber },
                  { $addToSet: { sensor: deviceID }, floor: floorNumber },
                  { upsert: true }
                );
            }
        }

        console.log(`[DB] ${colors.green(`Room data initialization completed successfully.`)}`);
    } catch (err) {
        console.log(`[DB] ${colors.red(`Room data initialization failed: ${err}`)}`)
    }
};

module.exports = { connect };