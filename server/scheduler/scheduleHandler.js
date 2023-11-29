const schedule = require('node-schedule');
const colors = require('colors');
const child_process = require('child_process');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);

const Prediction = require('../db/models/Prediction');
const SensorData = require('../db/models/SensorData');


const schedulePredictions = async (io) => {
    const everyHour = '0 * * * *';
    const everyMinute = '* * * * *';
    const job = schedule.scheduleJob(everyHour, async () => {
        console.log(`[SCHEDULER] ${colors.blue(`${new Date().toLocaleTimeString()}`)} ${colors.green("Started scheduled database cleanup.")}`);
        execDatabaseCleanup();
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
      } catch (error) {
        console.log(`[DB] ${colors.red("Error occurred while deleting old entries:")} ${err}`);
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