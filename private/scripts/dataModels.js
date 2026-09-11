/**
 * @author Ben Judson
 * @Date 26 Nov 2025
 * @Purpose model for creation of data objects
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const iterations = 100000; //hashes this many times
const keyLength = 64; //char length
const digest = 'sha512'; //alorithim
let models = {};
const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: false
    },
    gameKey:{
        type: Number,
        required: false
    },
    salt:{
        type: String,
        required: false
    },
    email:{
        type: String,
        required: true
    },
    pfp:{
        type: String,
        required: false
    }
})
userSchema.statics.authenticate = async function(userAccount, password){ //the authentication function to check the password
    const user = userAccount;
    if(!user){
        return null;
    }
    return new Promise((resolve, reject)=>{
        crypto.pbkdf2(password, user.salt, iterations, keyLength, digest, (err, derivedKey)=>{
            if(err) return reject(err);
            const inputHash = derivedKey.toString('hex');
            if(inputHash === user.password){
                resolve(user);
            }else{
                resolve(null);
            }
        })
    })
};
userSchema.statics.hashPassword = function(password){ //hashes password, returns promise
    return new Promise((resolve, reject)=>{
        const salt = crypto.randomBytes(16).toString('hex'); //generates unique salt
        crypto.pbkdf2(password, salt, iterations, keyLength, digest, (err, newPassword)=>{
        if(err) return reject(err);
            resolve({salt:salt, hashedPassword: newPassword.toString('hex')});
        })
    });
}
models.UserModel = mongoose.model("User",userSchema, "User");
module.exports = models;