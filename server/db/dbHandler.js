const mongoose = require('mongoose');
const colors = require('colors');

const dbOptions = {
    useNewUrlParser: true, 
    useUnifiedTopology: true
}

const connect = () => {
    mongoose.connect(process.env.DB_URI, dbOptions)
        .then(() =>  {
            console.log(`[DB] ${colors.green(`Connected to the DB`)}`);
        })
        .catch((err) => console.log(`[DB] ${colors.red(`Error while connecting to the DB: ${err}`)}`));
}

module.exports = { connect };