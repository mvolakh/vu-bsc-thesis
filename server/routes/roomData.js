const express = require('express');

const Room = require('../db/models/Room')

const router = express.Router();

router.get('/', async (req, res, next) => {
    const roomData = await Room.find();
    res.status(200).json(roomData);
})

module.exports = router;