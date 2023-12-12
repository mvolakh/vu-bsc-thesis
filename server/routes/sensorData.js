const express = require('express');

const Sensor = require('../db/models/Sensor')

const router = express.Router();

router.get('/:id', async (req, res, next) => {
    const latestDataBySensor = await Sensor.aggregate([
        {
            $match: {
              floor: parseInt(req.params.id)
            }
          },
          {
            $lookup: {
              from: 'latestsensordatas',
              localField: 'name',
              foreignField: 'sensor',
              as: 'latestSensorData'
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              colorCode: 1,
              x_coord: 1,
              y_coord: 1,
              width: 1,
              height: 1,
              floor: 1,
              room: 1,
              latestSensorData: {
                $cond: {
                  if: { $eq: [{ $size: '$latestSensorData' }, 0] },
                  then: {},
                  else: { $arrayElemAt: ['$latestSensorData', 0] }
                }
              }
            }
          },
          {
            $project: {
              'latestSensorData.sensor': 0
            }
          }
        ]).allowDiskUse(true);
  
    res.status(200).json(latestDataBySensor);
})



module.exports = router;