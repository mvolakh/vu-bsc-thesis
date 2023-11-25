const express = require('express');

const Prediction = require('../db/models/Prediction');
const Room = require('../db/models/Room');

const router = express.Router();

router.get('/', async (req, res, next) => {
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
            $sort: {
                'sensorData.timestamp': -1
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
                sensorData: { $ifNull: ["$sensorData", {}] }
            }
        },
        {
            $sort: {
                name: 1
            }
        }
    ]).allowDiskUse(true);

    res.status(200).json(forecasts);
})

// router.get('/week/:id', async (req, res, next) => {
//     const roomData = await Room.find();
//     res.status(200).json(roomData);
// })

module.exports = router;