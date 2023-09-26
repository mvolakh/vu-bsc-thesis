const { Schema, model } = require('mongoose');

const SensorDataSchema = new Schema({
    sensor: {
        type: String,
        // ref: 'Room',
        required: true
    },
    room: {
        type: String,
        required: true
    },
    co2Level: {
        type: Number
    },
    noiseLevel: {
        type: Number
    },
    date: {
        type: Date,
        default: Date.now()
    }
});

const SensorData = model('SensorData', SensorDataSchema);

module.exports = SensorData;