const mongoose = require('mongoose');
const colors = require('colors');
const xlsx = require('xlsx');

const Room = require('./models/Room');
const SensorData = require('./models/SensorData');

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
            await indexSensorData();
            await indexRooms();
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

async function indexSensorData() {
    try {
        await SensorData.collection.createIndex({ "timestamp": -1 }, (err, result) => {
            if (result) {
                console.log(`[DB] ${colors.green(`Index created for SensorData collection : ${result}`)}`)
            }
        });

        await SensorData.collection.createIndex({ "sensor": 1 }, (err, result) => {
            if (result) {
                console.log(`[DB] ${colors.green(`Index created for SensorData collection : ${result}`)}`)
            }
        });

        console.log(`[DB] ${colors.green(`Indexing of SensorData collection completed successfully.`)}`);
    } catch (err) {
        console.log(`[DB] ${colors.red(`Indexing of SensorData collection failed: ${err}`)}`)
    }
}

async function indexRooms() {
    try {
        await Room.collection.createIndex({ "floor": 1, "sensor": 1 }, (err, result) => {
            if (result) {
                console.log(`[DB] ${colors.green(`Index created for Room collection : ${result}`)}`)
            }

            if (err)
                console.log(err)
        });

        // await Room.collection.createIndex({ "name": 1 }, (err, result) => {
        //     if (result) {
        //         console.log(`[DB] ${colors.green(`Index created for Room collection : ${result}`)}`)
        //     }

        //     if (err)
        //         console.log(err)
        // });

        console.log(`[DB] ${colors.green(`Indexing of Room collection completed successfully.`)}`);
    } catch (err) {
        console.log(`[DB] ${colors.red(`Indexing of Room collection failed: ${err}`)}`);
   }
}

async function updateRoomCoords() {
  try {
    const roomCoords = [
      {
        name: 'NU-11A-29',
        width: 23,
        height: 38,
        x_coord: 100,
        y_coord: 10,
      },
      {
        name: 'NU-11A-33',
        width: 48,
        height: 38,
        x_coord: 149,
        y_coord: 10,
      },
      {
        name: 'NU-11A-37',
        width: 72,
        height: 38,
        x_coord: 198,
        y_coord: 10,
      },
      {
        name: 'NU-11A-46',
        width: 48,
        height: 36,
        x_coord: 296,
        y_coord: 67,
      },
      {
        name: 'NU-11A-48',
        width: 23,
        height: 38,
        x_coord: 346,
        y_coord: 10,
      },
      {
        name: 'NU-11A-56',
        width: 24,
        height: 36,
        x_coord: 419,
        y_coord: 67,
      },
      {
        name: 'NU-11A-58',
        width: 24,
        height: 36,
        x_coord: 444,
        y_coord: 67,
      },
      {
        name: 'NU-11A-60',
        width: 49,
        height: 59,
        x_coord: 419,
        y_coord: 104,
      },
      {
        name: 'NU-11A-65',
        width: 48,
        height: 38,
        x_coord: 542,
        y_coord: 10,
      },
      {
        name: 'NU-11A-66',
        width: 35,
        height: 34,
        x_coord: 530,
        y_coord: 67,
      },
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