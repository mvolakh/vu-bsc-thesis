const { Schema, model } = require('mongoose');

const roomSchema = new Schema({
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
        default: 100
    },
    y_coord: {
        type: Number,
        default: 100
    },
    width: { 
        type: Number, 
        default: 25 
    },
    height: { 
        type: Number,
        default: 40
    },
    sensor: {
        type: [String],
        required: true
    },
    colorCode: {
        type: String,
        default: 'grey'
    }
});

const Room = model('Room', roomSchema);

module.exports = Room;