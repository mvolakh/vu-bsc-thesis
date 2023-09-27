const mqtt = require('mqtt');
const colors = require('colors');

const SensorData = require('../db/models/SensorData')

const mqttOptions = {
    clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
};

const connect = (io) => {
    const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, mqttOptions)

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

            // save to the database
            const newSensorData = new SensorData({ ...completeData })
            const savedSensorData = await newSensorData.save();

            //send to the socket
            io.emit('mqttData', completeData);

            // clean the buffer
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

module.exports = { connect };