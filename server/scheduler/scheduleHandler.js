const schedule = require('node-schedule');
const colors = require('colors');
const child_process = require('child_process');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);

const Prediction = require('../db/models/Prediction');
const SensorData = require('../db/models/SensorData');
const Sensor = require('../db/models/Sensor');
const Room = require('../db/models/Room');


const schedulePredictions = async (io) => {
    const everyHour = '0 * * * *';
    const everyMinute = '* * * * *';
    const job = schedule.scheduleJob(everyHour, async () => {
        console.log(`[SCHEDULER] ${colors.blue(`${new Date().toLocaleTimeString()}`)} ${colors.green("Started scheduled database cleanup.")}`);
        execDatabaseCleanup();
        execMarkOldEntries();
        // execDatabaseBackup();

        console.log(`[SCHEDULER] ${colors.blue(`${new Date().toLocaleTimeString()}`)} ${colors.green("Started forecasting.")}`);
        execPredictScript(io);
    });

    return job;
}

const execDatabaseBackup = async () => {
    console.log(`[DB] ${colors.green("Database backup script started.")}`);

    const timestampBackup = new Date().toLocaleString('en-US', 
        { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        }).replace(/[^\d]/g, '');

    const childProcess = child_process.spawn('mongodump', [
        "--uri", `${process.env.DB_URI}`,
        "--db", "test",
        "--out", `${process.env.DB_BACKUP_DIR}/${timestampBackup}`]);

    childProcess.on('close', async (status) => {
        console.log(`[DB] ${colors.green("Finished creating a scheduled backup.")}`);
    });
}

const execDatabaseCleanup = async () => {
    console.log(`[DB] ${colors.green("Starting to delete old entries.")}`);

    const daysToKeep = 3;
    const timestampDeletion = new Date();
    timestampDeletion.setDate(timestampDeletion.getDate() - daysToKeep);

    try {
        const res = await SensorData.deleteMany({ timestamp: { $lt: timestampDeletion } });
        console.log(`[DB] ${colors.green("Successfuly deleted old entries. Documents deleted:")} ${res.deletedCount}`);
      } catch (err) {
        console.log(`[DB] ${colors.red("Error occurred while deleting old entries:")} ${err}`);
      }
}

const execMarkOldEntries = async () => {
    console.log(`[DB] ${colors.green("Starting to update color codes of old entries.")}`);

    const hoursToLeaveUnchanged = 1;
    const timestampThreshold = new Date();
    timestampThreshold.setHours(timestampThreshold.getHours() - hoursToLeaveUnchanged);

    try {
        const sensorsToUpdate = await Sensor.aggregate([
            {
                $lookup: {
                    from: "latestsensordatas",
                    localField: "name",
                    foreignField: "sensor",
                    as: "sensorData"
                }
            },
            {
                $unwind: "$sensorData"
            },
            {
                $match: {
                    "sensorData.timestamp": { $lt: timestampThreshold }
                }
            }
        ]);

        const sensorIdsToUpdate = sensorsToUpdate
            .map(sensor => sensor._id);
        
        const sensorUpdateResult = await Sensor.updateMany(
            { _id: { $in: sensorIdsToUpdate } },
            { $set: { colorCode: 'grey' } }
        );

        const roomsToUpdate = await Room.aggregate([
            {
                $lookup: {
                    from: 'latestsensordatas',
                    localField: 'sensor',
                    foreignField: 'sensor',
                    as: 'sensorData'
                }
            },
            {
                $unwind:
                {
                  path: '$sensorData',
                  preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: {
                    'sensorData.timestamp': -1
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    colorCode: { $first: '$colorCode' },
                    latestSensorData: { $first: '$sensorData' }
                }
            },
            {
                $addFields: {
                    isOlderThanOneHour: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$latestSensorData.timestamp", null] },
                                    { $lt: ["$latestSensorData.timestamp", timestampThreshold] }
                                ]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            }
        ]);

        const roomIdsToUpdate = roomsToUpdate
            .filter(room => room.isOlderThanOneHour)
            .map(room => room._id);

        const roomUpdateResult = await Room.updateMany(
            { _id: { $in: roomIdsToUpdate } },
            { $set: { colorCode: 'grey' } }
        );
        
        console.log(`[DB] ${colors.green("Successfuly changed the color code of old entries to grey (sensors).")} Documents changed: ${sensorUpdateResult.modifiedCount}`);
        console.log(`[DB] ${colors.green("Successfuly changed the color code of old entries to grey (rooms).")} Documents changed: ${roomUpdateResult.modifiedCount}`);
    } catch (err) {
        console.log(`[DB] ${colors.red("Error occurred while changing the color of old entries to grey:")} ${err}`);
    }
}

const execPredictScript = async (io) => {
    const childProcess = child_process.spawn('python', [`${process.env.PREDICT_PYTHON_PATH}`]);
    console.log(`[CHILD_PROCESS] ${colors.green("Prediction script child process spawned.")}`);

    childProcess.stdout.on('data', (data) => {
        console.log(`[CHILD_PROCESS] ${colors.green("stdout:")} ${data.toString().trim()}`);
    });

    childProcess.stderr.on('data', (err) => {
        console.error(`[CHILD_PROCESS] ${colors.red(`Exited with an error code: ${err}`)}`);
    });

    childProcess.on('close', async (status) => {
        console.log(`[CHILD_PROCESS] ${colors.green("Finished executing.")}`);
        const predictions = await Prediction.find();

        io.emit('forecastData', {
            ...predictions
        })
        
        console.log(`[SCHEDULER] ${colors.green("Sent the predictions over a socket.")}`);
    });
}


module.exports = { schedulePredictions };