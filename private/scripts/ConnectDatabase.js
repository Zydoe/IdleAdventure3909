/**
 * @program: {Final Project, code to connect to database}
 * @author: {Ben Judson}
 */
const mongoose = require("mongoose");
require("dotenv").config();
let database;
let connectingPromise = null;
const uri = "mongodb://"+process.env.MONGO_USERNAME+":"+process.env.MONGO_PASSWORD+"@ac-iayctzo-shard-00-00.hzko21g.mongodb.net:27017,ac-iayctzo-shard-00-01.hzko21g.mongodb.net:27017,ac-iayctzo-shard-00-02.hzko21g.mongodb.net:27017/IdleAdventure?ssl=true&replicaSet=atlas-5ux6q3-shard-0&authSource=admin&appName=Cluster0";

async function connectMongoDB(){
    if(database){
        return database;
    }

    if(!connectingPromise){
        connectingPromise = (async ()=>{
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000
            })
            database = mongoose.connection;
            console.log("Database connected");
            return database;
        })()
    }

    return connectingPromise;
}

module.exports = connectMongoDB; 