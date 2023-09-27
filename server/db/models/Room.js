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
    sensor: {
        type: [String],
        required: true
    },
});

const Room = model('Room', roomSchema);

module.exports = Room;