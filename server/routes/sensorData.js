const express = require('express');

const SensorData = require('../db/models/SensorData')

const router = express.Router();

router.get('/', async (req, res, next) => {
    const sensorData = await SensorData.find();
    res.status(200).json(sensorData);
})

module.exports = router;