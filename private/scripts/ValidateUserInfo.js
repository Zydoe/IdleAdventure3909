/**
 * @program: {ValidateUserInfo, Process user form submition}
 * @author: {Ben Judson}
 */

const fs = require("fs");
const path = require("node:path");
const connectDatabase = require("./ConnectDatabase");
const mongoose = require('mongoose');
const hasher = require('pbkdf2-password');
const crypto = require('crypto');
const models = require('./dataModels');

let userAccounts;
getUserAccounts();
const accountPath = path.join(__dirname,"..","..","private","users","accounts.json");


/**
 * 
 * @returns true if valid information was entered
 */
async function ValidateSignUp(email, password, password2){
    if(password===undefined||email===undefined||password2===undefined || password===null||email===null||password2===null){
        return "All fields are required";
    }
    else if(password===password2){
        let account = await userAccounts.findOne({email:email});
        if(account){
            return "Sorry an account with that email already exists.";
        }
        else if(email.includes('@')&&email.includes('.')){
            if(password.length>=5){
                return true;
            }
            else{
                return "Pasword is too short. Must be greater than 5 characters";
            }
        }
        else{
            return "This email is invalid";
        }
    }
    else{
        return "Passwords do not match";
    }
}
    
async function ValidateLogin(email, password){
    if(email.includes('@')&&email.includes('.')){ //if email looks right
        let account = await userAccounts.findOne({email:email});
        if(account){
            if(await models.UserModel.authenticate(account,password)){
                console.log("User: " + account.email + " has logged in!");
                return true;
            }
            else{
                return "Either your Email, or your Password were incorrect. Please try again";
            }
        }
        else{
            return "Account not found. Please check your email";
        }   
    }
    else{
        return "Please provide a correct email";
    }
     
}



/**
 * 
 * @param {The part of the user email before @} username 
 * @param {Used for the recursive property} suffix 
 * @returns A unique username
 */
async function ValidateUserName(username,suffix=0){
    let account = await userAccounts.findOne({username:username});
    if(!account){ //If the username is not taken
        return username;
    }
    else{
        suffix++;
        let newUsername = account.userName + suffix;
        return ValidateUserName(newUsername,suffix);
    }
}

function ValidateEmail(email,userAccounts){
    if(email.includes('@')&&email.includes('.')){ //valid looking email
        accounts = JSON.parse(fs.readFileSync(accountPath));
        email= email.toLowerCase();
        for(let i=0;i<accounts.length;i++){
            if(accounts[i].email===email){
                return "An account with that email already exists";
            }
        }
        return true;
    }
    else{
        return "Email is not a valid Email";
    }
}

async function getUserAccounts() {
    const db = await connectDatabase();
    userAccounts = db.collection("User");
}

async function CreateNewUser(username, password, gameKey, email, pfp){
    try{
        let hashedPassword = null;
        if(password){
            hashedPassword = await models.UserModel.hashPassword(password);
        }
        const newUser = new models.UserModel({ username: username, password: hashedPassword ? hashedPassword.hashedPassword : null, salt: hashedPassword ? hashedPassword.salt : null, gameKey: gameKey, email: email, pfp: pfp });
        await newUser.save();
        console.log("Created new user: " + username);
        return newUser;
    }
    catch(e){
        console.log("Error creating a user: " + e);
    }
    
}


module.exports={ValidateSignUp,ValidateLogin,ValidateUserName,ValidateEmail,CreateNewUser};
//If valid, respond with true, otherwise a reason why not