# BSc Thesis Project

<div >
	<img width="20" src="https://user-images.githubusercontent.com/25181517/117447155-6a868a00-af3d-11eb-9cfe-245df15c9f3f.png" alt="JavaScript" title="JavaScript"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/183890598-19a0ac2d-e88a-4005-a8df-1ee36782fde1.png" alt="TypeScript" title="TypeScript"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/183568594-85e280a7-0d7e-4d1a-9028-c8c2209e073c.png" alt="Node.js" title="Node.js"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/183859966-a3462d8d-1bc7-4880-b353-e2cbed900ed6.png" alt="Express" title="Express"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/117448124-a2da9800-af3e-11eb-85d2-bd1b69b65603.png" alt="Vue.js" title="Vue.js"/>
	<img width="20" src="https://github.com/marwin1991/profile-technology-icons/assets/136815194/50c63e54-074f-494b-b786-01eb7870c927" alt="Vuetify.js" title="Vuetify.js"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/182884177-d48a8579-2cd0-447a-b9a6-ffc7cb02560e.png" alt="mongoDB" title="mongoDB"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/192107858-fe19f043-c502-4009-8c47-476fc89718ad.png" alt="REST" title="REST"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/187070862-03888f18-2e63-4332-95fb-3ba4f2708e59.png" alt="websocket" title="websocket"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/121401671-49102800-c959-11eb-9f6f-74d49a5e1774.png" alt="npm" title="npm"/>
	<img width="20" src="https://user-images.githubusercontent.com/25181517/189716058-71f74b6f-5936-40b5-92e3-00381e35ccb9.png" alt="Material Design" title="Material Design">
</div>

*This project is an integral component of a BSc Computer Science thesis at Vrije Universiteit Amsterdam.*

This repository hosts a project dedicated to the development of a room occupancy monitoring and prediction system tailored for university buildings. It integrates real-time sensor data sourced from MQTT streams, interfaces with the university reservation system via its API, and employs machine learning techniques to forecast future room occupancy.

## Setup

The following sections contain information on how to replicate/run the project demo.



### Starting the project

Requirements:
[Node.js](https://nodejs.org/en)
[npm](https://docs.npmjs.com/) (included with a Node.js installation)

**The project has been tested using Node v16.14.2 (any version above should work fine, theoretically).**

#### Server
First install the dependencies:

```cd server && npm install```

Then the server could be run by executing the following script and endpoints will be accessible on the port specified in the local environmental variables:

```npm run start```

#### Client

First install the dependencies:
```cd client && npm install```

Then the client (dev server) could be run by executing the following script:

```npm run dev```

Then the application could be accessed at ```localhost:5173```.

### Authorisation

Project uses environmental variables through dotenv npm module. You have to be authorized both to access the MQTT data the and to be able to connect to the database.

Source code uses the following environmental variables (case-sensitive, exact spelling)

```PORT```
Port the server runs on.

```MQTT_USERNAME```
Username of a client connecting to the MQTT server (must be configured on the server).

```MQTT_PASSWORD```
Password of a client connecting to the MQTT server (must be configured on the server).

```MQTT_HOST```
MQTT host URI.

```DB_URI```
MongoDB connection string containing the username and the password. Any options params must be URL encoded.

```ROOM_DATA_PATH```
Path containing the xlsx file with the room information.

## Data

### Preprocessing scripts

Used script flow:
1. construct
2. average
3. reduce
4. augment
5. normalize
6. sort

```preprocess-construct```
Combines two types of logged MQTT messages.

```preprocess-average```
Averages the recordings on an hourly basis.

```preprocess-reduce```
Removes recordings for each day for which the data is for any hour is missing.

```preprocess-augment```
Adds two additional metrics to each recording: day on which the recording took place and a room type.

```preprocess-normalize```
Normalizes the values in the dataset (eCO2, sound level, light level, sensor name, room type).

```preprocess-sort```
Extracts and sorts the data on a by-sensor basis.



