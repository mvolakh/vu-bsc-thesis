const mqtt = require('mqtt');
const colors = require('colors');

const SensorData = require('../db/models/SensorData')

const mqttOptions = {
    clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
};

const connect = () => {
    const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, mqttOptions)

    mqttClient.on('connect', () => {
        console.log(`[MQTT] ${colors.green("Connection established successfully")}`);
    
        mqttClient.subscribe([process.env.MQTT_TOPIC], () => {
            console.log(`[MQTT] ${colors.green("Subscribed to topic:")} ${colors.blue(process.env.MQTT_TOPIC)}`);
        })
    });

    mqttClient.on('message', async (topic, payload) => {
        // console.log(`[MQTT] ${colors.green("Received message:")} ${colors.blue(topic)} ${payload.toString()}`);

        const jsonData = JSON.parse(payload);

        const newSensorData = new SensorData({
            sensor: jsonData.sensor,
            room: 'TestRoom',
            co2Level: jsonData.eCO2,
            noiseLevel: jsonData.sound
        });

        // const savedSensorData = await newSensorData.save();

        // if (savedSensorData)
        //     console.log(`[DB] ${colors.green(`Data saved successfully: ${savedSensorData}`)}`)
    });

    return mqttClient;
}

module.exports = { connect };