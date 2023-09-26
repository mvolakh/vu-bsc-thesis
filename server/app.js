const express = require('express');
const colors = require('colors');
const morgan = require('morgan');
const dotenv = require('dotenv').config();

const mqttHandler = require('./mqtt/mqttHandler');
const dbHandler = require('./db/dbHandler');

const app = express();

app.use(morgan('dev'));

const initializeApp = async () => {
    try {
        await dbHandler.connect();
        await mqttHandler.connect();

        app.listen(process.env.PORT, () => {
            console.log(`[SERVER] ${colors.green(`App listening on port ${process.env.PORT}`)}`);
        });

        app.get('/', (req, res) => {
            res.send('Hello world!');
        });
    } catch (err) {
        console.error(`[APP] ${colors.red(`Error initializing the application: ${err}`)}`);
    }
};

initializeApp();