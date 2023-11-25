const mqtt = require('mqtt');
const colors = require('colors');

const SensorData = require('../db/models/SensorData')
const Room = require('../db/models/Room');
const LatestSensorData = require('../db/models/LatestSensorData');
const Prediction = require('../db/models/Prediction');

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
            let room = await Room.findOne({ sensor: completeData.sensor });
            // const colorCode = calcRoomColorCode(completeData);
            room.colorCode = calcRoomColorCode(completeData);
            await room.save();

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

            // const predictions = await Prediction.findOne({ sensor: completeData.sensor });

            // if (predictions) {
            //     // console.log(predictions)
            //     io.emit('forecastData', {
            //         name: 'NU-11A-46',
            //         sensorData: predictions
            //     })
            // }

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

const calcRoomColorCode = (message) => {
    if (!message.eCO2 && !calculateAverageLightLevel(message)) {
        return 'grey'
    } else {
        if (message.eCO2 > 1000 && calculateAverageLightLevel(message) > 15) {
            return 'red'
        } else if (message.eCO2 > 750 && calculateAverageLightLevel(message) > 15) {
            return 'orange'
        } else {
            return 'green'
        } 
    }
}

const calculateAverageLightLevel = (message) => {
    return (message.color_b + message.color_c + message.color_r + message.color_g) / 4;
}

module.exports = { connect };