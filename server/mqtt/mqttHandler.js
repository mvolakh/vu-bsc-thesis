const mqtt = require('mqtt');
const colors = require('colors');
var fs = require('fs');

const SensorData = require('../db/models/SensorData')
const Room = require('../db/models/Room');
const Sensor = require('../db/models/Sensor');
const LatestSensorData = require('../db/models/LatestSensorData');
const Prediction = require('../db/models/Prediction');

let thresholds = {};

const mqttOptions = {
    clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
};

const connect = (io) => {
    const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, mqttOptions)
    loadThresholdsJSON();

    mqttClient.on('connect', () => {
        console.log(`[MQTT] ${colors.green("Connection established successfully")}`);
    
        mqttClient.subscribe([process.env.MQTT_TOPIC], () => {
            console.log(`[MQTT] ${colors.green("Subscribed to topic:")} ${colors.blue(process.env.MQTT_TOPIC)}`);
        })
    });

    const messageBuffer = new Map();
    mqttClient.on('message', async (topic, payload) => {
        // console.log(`[MQTT] ${colors.green("Received message:")} ${colors.blue(topic)} ${payload.toString()}`);

        const jsonData = JSON.parse(payload);

        if (isType1Message(jsonData)) {
            messageBuffer.set(jsonData.sensor, jsonData);
        } else if (isType2Message(jsonData) && messageBuffer.has(jsonData.sensor)) {
            const completeData = { ...messageBuffer.get(jsonData.sensor), ...jsonData }
            let room = await Room.findOne({ sensor: completeData.sensor });
            room.colorCode = calcRoomColorCode(completeData);
            await room.save();

            let sensor = await Sensor.findOne({ name: completeData.sensor });
            sensor.colorCode = calcRoomColorCode(completeData);
            await sensor.save();

            room = await Room.findOne({ sensor: completeData.sensor });

            const newSensorData = new SensorData({ ...completeData });
            const savedSensorData = await newSensorData.save();
            // console.log(`[DB] ${colors.green("Saved retrieved message:")} ${savedSensorData.toString()}`);

            const latestSensorData = await LatestSensorData.findOneAndUpdate(
                { sensor: completeData.sensor },
                { ...completeData, timestamp: new Date() },
                { upsert: true, new: true }
            )

            // console.log(`[DB] ${colors.green("Saved retrieved message:")} ${latestSensorData.toString()}`);

            io.emit('mqttData', { 
                ...savedSensorData.toJSON(), 
                room: room.name, 
                floor: room.floor, 
                x_coord: room.x_coord,
                y_coord: room.y_coord,
                width: room.width,
                height: room.height,
                colorCode: room.colorCode
            });

            messageBuffer.delete(jsonData.sensor)
        }
    });

    return mqttClient;
}

const isType1Message = (message) => {
    return 'eCO2' in message;
}

const isType2Message = (message) => {
    return 'color_r' in message;
}

const loadThresholdsJSON = () => {
    thresholds = JSON.parse(fs.readFileSync('./ml/obj/thresholds.json', 'utf8'));
}

const calcRoomColorCode = (message) => {
    const currentDate = new Date();
    const day = currentDate.getDay();
    const hour = currentDate.getHours();

    const metrics = ['eCO2', 'light', 'sound'];
    // for (let i = 0; i < metrics.length; i++) {
    //     const metric = metrics[i];
    //     if (metric === 'light') {
    //         const light = calculateAverageLightLevel(message);
    //         if (light > thresholds[message['sensor']][day][hour][metric]['high']) {
    //             return 'red';
    //         } else if (light > thresholds[message['sensor']][day][hour][metric]['medium']) {
    //             return 'orange';
    //         }
    //     } else {
    //         if (message[metric] > thresholds[message['sensor']][day][hour][metric]['high']) {
    //             return 'red';
    //         } else if (message[metric] > thresholds[message['sensor']][day][hour][metric]['medium']) {
    //             return 'orange';
    //         }
    //     }
    // }

    let highCounter = 0;
    let midCounter = 0;

    for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        if (metric === 'light') {
            const light = calculateAverageLightLevel(message);
            if (light > thresholds[message['sensor']][day][hour][metric]['high']) {
                highCounter++;
            } else if (light > thresholds[message['sensor']][day][hour][metric]['medium']) {
                midCounter++;
            }
        } else {
            if (message[metric] > thresholds[message['sensor']][day][hour][metric]['high']) {
                highCounter++;
            } else if (message[metric] > thresholds[message['sensor']][day][hour][metric]['medium']) {
                midCounter++;
            }
        }
    }

    if (highCounter >= 2) return 'red';
    if (midCounter >= 2) return 'orange';
    if (highCounter >= 1 && midCounter >= 1) return 'orange';

    return 'green';
}

const calculateAverageLightLevel = (message) => {
    return (message.color_b + message.color_c + message.color_r + message.color_g) / 4;
}

module.exports = { connect };