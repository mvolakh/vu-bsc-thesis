const express = require('express');
const child_process = require('child_process');
const colors = require('colors');

const Room = require('../db/models/Room');
const Sensor = require('../db/models/Sensor');

const router = express.Router();

router.get('/rooms/:modelType', async (req, res, next) => {
    const timestamp = new Date(new Date().setMinutes(0, 0, 0)).toISOString();
    const forecasts = await Room.aggregate([
        {
            $lookup: {
                from: 'predictions',
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
            $match: {
                'sensorData.timestamp': { $gte: timestamp },
                'sensorData.modelType': req.params.modelType
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                sensorData: { $first: '$sensorData' }
            }
        },
        {
            $project: {
                _id: 0,
                name: 1,
                timestamp: "$sensorData.timestamp",
                sensorData: { $ifNull: ["$sensorData", {}] }
            }
        },
        {
            $sort: {
                'sensorData.sensor': 1
            }
        }
    ]).allowDiskUse(true);

    res.status(200).json(forecasts);
})

router.get('/sensors/:modelType', async (req, res, next) => {
    const timestamp = new Date(new Date().setMinutes(0, 0, 0)).toISOString();
    const forecasts = await Sensor.aggregate([
        {
            $lookup: {
                from: 'predictions',
                localField: 'name',
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
            $match: {
                'sensorData.timestamp': { $gte: timestamp },
                'sensorData.modelType': req.params.modelType
            }
        },
        {
            $group: {
                _id: '$_id',
                room: { $first: '$room' },
                sensorData: { $first: '$sensorData' }
            }
        },
        {
            $project: {
                _id: 0,
                room: 1,
                timestamp: "$sensorData.timestamp",
                sensorData: { $ifNull: ["$sensorData", {}] }
            }
        },
        {
            $sort: {
                'sensorData.sensor': 1
            }
        }
    ]).allowDiskUse(true);

    res.status(200).json(forecasts);
})

router.get('/update', async (req, res, next) => {
    const childProcess = child_process.spawn('python', [`${process.env.PREDICT_PYTHON_PATH}`, ['--live']]);
    console.log(`[CHILD_PROCESS] ${colors.green("Prediction script child process spawned manually.")}`);

    childProcess.stdout.on('data', (data) => {
        console.log(`[CHILD_PROCESS] ${colors.green("stdout:")} ${data.toString().trim()}`);
    });

    childProcess.stderr.on('data', (err) => {
        console.error(`[CHILD_PROCESS] ${colors.red(`Exited with an error code: ${err}`)}`);
    });

    childProcess.on('close', async (status) => {
        console.log(`[CHILD_PROCESS] ${colors.green("Finished executing.")}`);

        res.status(200).send()
    });
})

module.exports = router;