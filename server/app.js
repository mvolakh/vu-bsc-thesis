const express = require('express');
const colors = require('colors');
const morgan = require('morgan');
const dotenv = require('dotenv').config();
const cors = require('cors');

const mqttHandler = require('./mqtt/mqttHandler');
const dbHandler = require('./db/dbHandler');
const socketHandler = require('./socketio/socketHandler');

const sensorDataRouter = require('./routes/sensorData')

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: '*' }));

const initializeApp = async () => {
    try {
        const server = app.listen(process.env.PORT, () => {
            console.log(`[SERVER] ${colors.green(`App listening on port ${process.env.PORT}`)}`);
        });

        await dbHandler.connect();
        const io = await socketHandler.connect(server);
        const mqttClient = await mqttHandler.connect(io);


        app.use('/api/sensordata', sensorDataRouter);
    } catch (err) {
        console.error(`[APP] ${colors.red(`Error initializing the application: ${err}`)}`);
    }
};

initializeApp();