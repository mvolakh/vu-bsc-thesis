const { Schema, model } = require('mongoose');

const sensorDataSchema = new Schema({
    sensor: {
        type: String,
        required: true
    },
    eCO2: {
        type: Number
    },
    TVOC: {
        type: Number
    },
    pressure: { 
        type: Number
    },
    temperature: { 
        type: Number
    },
    humidity: {
        type: Number
    },
    voltage: { 
        type: Number
    },
    sound: { 
        type: Number
    },
    rssi: { 
        type: Number
    },
    color_b: { 
        type: Number
    },
    color_c: {
        type: Number
    },
    color_g:  {
        type: Number
    },
    color_r:  {
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SensorData = model('SensorData', sensorDataSchema);

module.exports = SensorData;