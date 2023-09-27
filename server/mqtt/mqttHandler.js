const mqtt = require('mqtt');
const colors = require('colors');

const SensorData = require('../db/models/SensorData')
const Room = require('../db/models/Room')

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
            const room = await Room.findOne({ sensor: completeData.sensor });

            const newSensorData = new SensorData({ ...completeData })
            const savedSensorData = await newSensorData.save();
            // console.log(`[DB] ${colors.green("Saved retrieved message:")} ${savedSensorData.toString()}`);

            io.emit('mqttData', { ...completeData, room: room.name, floor: room.floor} );

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