const { Schema, model } = require('mongoose');

function validatePredictionsLength(val) {
    console.log(val);
    return val.length === 3;
}

const predictionSchema = new Schema({
    sensor: {
        type: String,
        required: true,
        unique: true
    },
    predictions: {
        type: [
            {
                timestamp: {
                    type: String,
                    required: true,
                },
                co2Level: {
                    type: Number,
                    required: true,
                },
                lightLevel: {
                    type: Number,
                    required: true,
                },
                soundLevel: {
                    type: Number,
                    required: true,
                },
                colorCode: {
                    type: String,
                    required: true
                }
            },
        ],
        validate: [validatePredictionsLength, 'The "predictions" array must contain exactly 3 objects each of which represents a prediction made for the upcoming hour(s).'],
    },
});

const Prediction = model('Prediction', predictionSchema);

module.exports = Prediction;