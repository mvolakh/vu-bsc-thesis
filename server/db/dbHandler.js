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
        .then(async () =>  {
            console.log(`[DB] ${colors.green(`Connected to the DB`)}`);
            await initRooms();
            await updateRoomCoords();
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

async function updateRoomCoords() {
  try {
    const roomCoords = [
      {
        name: 'NU-11A-29',
        width: 23,
        height: 38,
        x_coord: 590,
        y_coord: 275,
      },
      {
        name: 'NU-11A-33',
        width: 48,
        height: 38,
        x_coord: 639,
        y_coord: 275,
      },
      {
        name: 'NU-11A-37',
        width: 72,
        height: 38,
        x_coord: 688,
        y_coord: 275,
      },
      {
        name: 'NU-11A-46',
        width: 48,
        height: 36,
        x_coord: 786,
        y_coord: 332,
      },
      {
        name: 'NU-11A-48',
        width: 23,
        height: 38,
        x_coord: 836,
        y_coord: 275,
      },
      {
        name: 'NU-11A-56',
        width: 24,
        height: 36,
        x_coord: 909,
        y_coord: 332,
      },
      {
        name: 'NU-11A-58',
        width: 24,
        height: 36,
        x_coord: 934,
        y_coord: 332,
      },
      {
        name: 'NU-11A-60',
        width: 49,
        height: 59,
        x_coord: 909,
        y_coord: 369,
      },
      {
        name: 'NU-11A-65',
        width: 48,
        height: 38,
        x_coord: 1032,
        y_coord: 275,
      },
      {
        name: 'NU-11A-66',
        width: 35,
        height: 34,
        x_coord: 1020,
        y_coord: 332,
      }
    ];

    for (const data of roomCoords) {
      const { name, height, width, x_coord, y_coord } = data;

      await Room.updateOne(
          { name },
          { $set: { height, width, x_coord, y_coord } }
      );
    }

    console.log(`[DB] ${colors.green(`Room coords updated successfully.`)}`);
  } catch (ert) {
    console.log(`[DB] ${colors.red(`Room coords data update failed: ${err}`)}`)
  }
}

async function getRoomAndFloor(sensorName) {
    try {
      const room = await Room.findOne({ sensor: sensorName });
  
      if (room) {
        return { roomName: room.name, floor: room.floor };
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

module.exports = { connect, initRooms, getRoomAndFloor };