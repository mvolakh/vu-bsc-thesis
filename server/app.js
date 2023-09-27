const express = require('express');
const colors = require('colors');
const morgan = require('morgan');
const dotenv = require('dotenv').config();
const cors = require('cors');

const mqttHandler = require('./mqtt/mqttHandler');
const dbHandler = require('./db/dbHandler');
const socketHandler = require('./socketio/socketHandler');

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: '*' }));

const initializeApp = async () => {
    try {
        const server = app.listen(process.env.PORT, () => {
            console.log(`[SERVER] ${colors.green(`App listening on port ${process.env.PORT}`)}`);
        });

        await dbHandler.connect();
        await mqttHandler.connect();
        await socketHandler.connect(server);

        app.get('/', (req, res) => {
            res.send('Hello world!');
        });
    } catch (err) {
        console.error(`[APP] ${colors.red(`Error initializing the application: ${err}`)}`);
    }
};

initializeApp();