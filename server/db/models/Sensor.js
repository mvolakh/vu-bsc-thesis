const { Schema, model } = require('mongoose');

const sensorSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    floor: {
        type: Number,
        required: true
    },
    x_coord: {
        type: Number,
        default: 0
    },
    y_coord: {
        type: Number,
        default: 0
    },
    width: { 
        type: Number, 
        default: 0
    },
    height: { 
        type: Number,
        default: 0
    },
    room: {
        type: String,
        required: true
    },
    colorCode: {
        type: String,
        default: 'grey'
    }
});

const Sensor = model('Sensor', sensorSchema);

module.exports = Sensor;