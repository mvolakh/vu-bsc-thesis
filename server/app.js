const express = require('express');
const colors = require('colors');
const morgan = require('morgan');
const dotenv = require('dotenv').config();
const dotenvExpand = require("dotenv-expand").expand(dotenv);
const cors = require('cors');
const path = require('path');

const mqttHandler = require('./mqtt/mqttHandler');
const dbHandler = require('./db/dbHandler');
const socketHandler = require('./socketio/socketHandler');
const scheduleHandler = require('./scheduler/scheduleHandler');

const sensorDataRouter = require('./routes/sensorData')
const roomDataRouter = require('./routes/roomData')
const forecastRouter = require('./routes/forecast')

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'dist')));

const initializeApp = async () => {
    try {
        const server = app.listen(process.env.PORT, () => {
            console.log(`[SERVER] ${colors.green(`App listening on port ${process.env.PORT}`)}`);
        });

        await dbHandler.connect();
        const io = await socketHandler.connect(server);
        const mqttClient = await mqttHandler.connect(io);
        const scheduler = await scheduleHandler.schedulePredictions(io);


        app.use('/api/sensordata', sensorDataRouter);
        app.use('/api/roomdata', roomDataRouter);
        app.use('/api/forecast', forecastRouter);
    } catch (err) {
        console.error(`[APP] ${colors.red(`Error initializing the application: ${err}`)}`);
    }
};

initializeApp();