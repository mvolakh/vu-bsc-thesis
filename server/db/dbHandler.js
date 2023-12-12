const mongoose = require('mongoose');
const colors = require('colors');
const xlsx = require('xlsx');

const Room = require('./models/Room');
const Sensor = require('./models/Sensor');
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
            await initSensors();
            await updateRoomCoords();
            await updateSensorCoords();
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

async function initSensors() {
    try {
        const workbook = xlsx.readFile(process.env.ROOM_DATA_PATH);
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        for (const row of sheetData) {
            const roomNumber = row['Room Number'];
            const deviceID = row['Device ID'];
            const floorRegex = roomNumber.match(/NU-(\d+)/);
            const floorNumber = floorRegex ? parseInt(floorRegex[1]) : null;
      
            if (roomNumber && deviceID && floorNumber !== null) {
                await Sensor.updateOne(
                    { name: deviceID },
                    { 
                        floor: floorNumber,
                        room: roomNumber
                    },
                    { upsert: true }
                );
            }
        }

        console.log(`[DB] ${colors.green(`Sensors info initialization completed successfully.`)}`);
    } catch (err) {
        console.log(`[DB] ${colors.red(`Sensors info initialization failed: ${err}`)}`)
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
            name: 'NU-10A-01',
            width: 37,
            height: 75,
            x_coord: 21,
            y_coord: 240,
        },
        {
            name: 'NU-10A-13',
            width: 37,
            height: 70,
            x_coord: 21,
            y_coord: 96,
        },
        {
            name: 'NU-11A-29',
            width: 23,
            height: 36,
            x_coord: 99,
            y_coord: 16,
        },
        {
            name: 'NU-11A-33',
            width: 48,
            height: 36,
            x_coord: 148,
            y_coord: 16,
        },
        {
            name: 'NU-11A-37',
            width: 71,
            height: 36,
            x_coord: 198,
            y_coord: 16,
        },
        {
            name: 'NU-11A-46',
            width: 49,
            height: 34,
            x_coord: 295,
            y_coord: 73,
        },
        {
            name: 'NU-11A-48',
            width: 23,
            height: 36,
            x_coord: 344,
            y_coord: 16,
        },
        {
            name: 'NU-11A-56',
            width: 23,
            height: 35,
            x_coord: 418,
            y_coord: 72,
        },
        {
            name: 'NU-11A-58',
            width: 23,
            height: 35,
            x_coord: 442,
            y_coord: 72,
        },
        {
            name: 'NU-11A-60',
            width: 47,
            height: 58,
            x_coord: 418,
            y_coord: 109,
        },
        {
            name: 'NU-11A-65',
            width: 48,
            height: 36,
            x_coord: 540,
            y_coord: 16,
        },
        {
            name: 'NU-11A-66',
            width: 35,
            height: 36,
            x_coord: 525,
            y_coord: 71,
        },
        {
            name: 'NU-12A-56',
            width: 23,
            height: 36,
            x_coord: 418,
            y_coord: 72,
        },
        {
            name: 'NU-12A-58',
            width: 23,
            height: 36,
            x_coord: 442,
            y_coord: 72,
        },
        {
            name: 'NU-12A-60',
            width: 72,
            height: 58,
            x_coord: 393,
            y_coord: 109,
        },
        {
            name: 'NU-12A-48',
            width: 23,
            height: 36,
            x_coord: 344,
            y_coord: 16,
        },
        {
            name: 'NU-12A-55',
            width: 23,
            height: 36,
            x_coord: 418,
            y_coord: 16,
        },
        {
            name: 'NU-12A-57',
            width: 23,
            height: 36,
            x_coord: 442,
            y_coord: 16,
        },
        {
            name: 'NU-12A-59',
            width: 23,
            height: 36,
            x_coord: 467,
            y_coord: 16,
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
  } catch (err) {
    console.log(`[DB] ${colors.red(`Room coords data update failed: ${err}`)}`)
  }
}

async function updateSensorCoords() {
    try {
        const sensorCoords = [
            {
                name: 'thingy015',
                width: 37,
                height: 37,
                x_coord: 21,
                y_coord: 240,
            },
            {
                name: 'thingy016',
                width: 37,
                height: 38,
                x_coord: 21,
                y_coord: 277,
            },
            {
                name: 'thingy012',
                width: 37,
                height: 35,
                x_coord: 21,
                y_coord: 96,
            },
            {
                name: 'thingy017',
                width: 37,
                height: 35,
                x_coord: 21,
                y_coord: 131,
            },
            {
                name: 'thingy035',
                width: 23,
                height: 9,
                x_coord: 99,
                y_coord: 16,
            },
            {
                name: 'thingy036',
                width: 23,
                height: 9,
                x_coord: 99,
                y_coord: 25,
            },
            {
                name: 'thingy037',
                width: 23,
                height: 9,
                x_coord: 99,
                y_coord: 34,
            },
            {
                name: 'thingy038',
                width: 23,
                height: 9,
                x_coord: 99,
                y_coord: 43,
            },
            {
                name: 'thingy031',
                width: 24,
                height: 36,
                x_coord: 148,
                y_coord: 16,
            },
            {
                name: 'thingy032',
                width: 24,
                height: 36,
                x_coord: 172,
                y_coord: 16,
            },
            {
                name: 'thingy033',
                width: 35,
                height: 36,
                x_coord: 198,
                y_coord: 16,
            },
            {
                name: 'thingy034',
                width: 36,
                height: 36,
                x_coord: 233,
                y_coord: 16,
            },
            {
                name: 'thingy055',
                width: 25,
                height: 34,
                x_coord: 295,
                y_coord: 73,
            },
            {
                name: 'thingy056',
                width: 24,
                height: 34,
                x_coord: 320,
                y_coord: 73,
            },
            {
                name: 'thingy053',
                width: 23,
                height: 18,
                x_coord: 344,
                y_coord: 16,
            },
            {
                name: 'thingy054',
                width: 23,
                height: 18,
                x_coord: 344,
                y_coord: 34,
            },
            {
                name: 'thingy051',
                width: 23,
                height: 18,
                x_coord: 418,
                y_coord: 72,
            },
            {
                name: 'thingy052',
                width: 23,
                height: 17,
                x_coord: 418,
                y_coord: 90,
            },
            {
                name: 'thingy002',
                width: 23,
                height: 18,
                x_coord: 442,
                y_coord: 72,
            },
            {
                name: 'thingy004',
                width: 23,
                height: 17,
                x_coord: 442,
                y_coord: 90,
            },
            {
                name: 'thingy006',
                width: 47,
                height: 29,
                x_coord: 418,
                y_coord: 109,
            },
            {
                name: 'thingy008',
                width: 47,
                height: 29,
                x_coord: 418,
                y_coord: 138,
            },
            {
                name: 'thingy021',
                width: 12,
                height: 18,
                x_coord: 540,
                y_coord: 16,
            },
            {
                name: 'thingy022',
                width: 12,
                height: 18,
                x_coord: 552,
                y_coord: 16,
            },
            {
                name: 'thingy023',
                width: 12,
                height: 18,
                x_coord: 564,
                y_coord: 16,
            },
            {
                name: 'thingy024',
                width: 12,
                height: 18,
                x_coord: 576,
                y_coord: 16,
            },
            {
                name: 'thingy025',
                width: 12,
                height: 18,
                x_coord: 540,
                y_coord: 34,
            },
            {
                name: 'thingy026',
                width: 12,
                height: 18,
                x_coord: 552,
                y_coord: 34,
            },
            {
                name: 'thingy027',
                width: 12,
                height: 18,
                x_coord: 564,
                y_coord: 34,
            },
            {
                name: 'thingy028',
                width: 12,
                height: 18,
                x_coord: 576,
                y_coord: 34,
            },
            {
                name: 'thingy003',
                width: 35,
                height: 18,
                x_coord: 525,
                y_coord: 71,
            },
            {
                name: 'thingy058',
                width: 35,
                height: 18,
                x_coord: 525,
                y_coord: 89,
            },
            {
                name: 'thingy042',
                width: 23,
                height: 18,
                x_coord: 418,
                y_coord: 90,
            },
            {
                name: 'thingy043',
                width: 23,
                height: 18,
                x_coord: 442,
                y_coord: 72,
            },
            {
                name: 'thingy044',
                width: 23,
                height: 18,
                x_coord: 442,
                y_coord: 90,
            },
            {
                name: 'thingy045',
                width: 36,
                height: 58,
                x_coord: 393,
                y_coord: 109,
            },
            {
                name: 'thingy046',
                width: 36,
                height: 58,
                x_coord: 429,
                y_coord: 109,
            },
            {
                name: 'thingy047',
                width: 23,
                height: 36,
                x_coord: 344,
                y_coord: 16,
            },
            {
                name: 'thingy065',
                width: 23,
                height: 18,
                x_coord: 418,
                y_coord: 16,
            },
            {
                name: 'thingy068',
                width: 23,
                height: 18,
                x_coord: 418,
                y_coord: 34,
            },
            {
                name: 'thingy061',
                width: 23,
                height: 18,
                x_coord: 442,
                y_coord: 16,
            },
            {
                name: 'thingy062',
                width: 23,
                height: 18,
                x_coord: 442,
                y_coord: 34,
            },
            {
                name: 'thingy063',
                width: 23,
                height: 18,
                x_coord: 467,
                y_coord: 16,
            },
            {
                name: 'thingy064',
                width: 23,
                height: 18,
                x_coord: 467,
                y_coord: 34,
            },
        ];

        for (const data of sensorCoords) {
            const { name, height, width, x_coord, y_coord } = data;
      
            await Sensor.updateOne(
                { name },
                { $set: { height, width, x_coord, y_coord } }
            );
        }

        console.log(`[DB] ${colors.green(`Sensor coords updated successfully.`)}`);
    } catch (err) {
        console.log(`[DB] ${colors.red(`Sensor coords data update failed: ${err}`)}`)
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