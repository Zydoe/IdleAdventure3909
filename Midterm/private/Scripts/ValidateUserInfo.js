/**
 * @program: {ValidateUserInfo, Process user form submition}
 * @author: {Ben Judson}
 */

const fs = require("fs");
const eventEmitter = require("node:events");
const { existsSync } = require("node:fs");
const path = require("node:path");
module.exports = new eventEmitter();

const accountPath = path.join(__dirname,"..","..","private","users","accounts.txt")


    /**
     * 
     * @returns true if valid information was entered
     */
    function ValidateSignUp(email, password, password2){
        if(password===undefined||email===undefined||password2===undefined || password===null||email===null||password2===null){
            return "All fields are required";
        }
        else if(password===password2){
            if(fs.existsSync(accountPath)){
                let accounts = JSON.parse(fs.readFileSync(accountPath,'utf-8'));
                for(let i=0;i<accounts.length;i++){
                    if(accounts[i].email === email){
                        return "Sorry an account with that email already exists.";
                    }
                }
            }
            if(email.includes('@')&&email.includes('.')){
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
    
    function ValidateLogin(email, password){
        if(email.includes('@')&&email.includes('.')){ //if email looks right
            if(fs.existsSync(accountPath)){ //if accounts.txt exists
                let accounts;
                try{
                    let data = fs.readFileSync(accountPath);
                    accounts = JSON.parse(data.toString());
                    for(let i=0;i<accounts.length;i++){
                        if(accounts[i].email===email){ //found user account
                            if(accounts[i].password===password){ //Used correct password
                                console.log("User: " + accounts[i].email + " has logged in!");
                                return true;
                            }
                            else{
                                return "Either your Email, or your Password were incorrect. Please try again";
                            }
                        }
                    }
                    return "Could not find an account with that email";
                }
                catch(e){
                    console.log("failed reading Accounts.txt: " + e);
                    return "Could not login. Try Again Later...";
                }
            }
            else{
                console.log("Could not find file: Accounts.txt");
                return "Something went wrong on our end. Please try again later.";
            }
        }
        else{
            return "Please enter a valid Email";
        }
    }
    /**
     * 
     * @param {The part of the user email before @} username 
     * @returns A unique username
     */
function ValidateUserName(username){
    if(existsSync(accountPath)){ //if accounts.txt exists
        let accounts;
        try{
            let data = fs.readFileSync(accountPath);
            accounts = JSON.parse(data.toString());
            let takenUsernames = accounts.map((account)=>{return account.username});

            if(!takenUsernames.includes(username)){ //If the username is not taken
                return username;
            }
            else{
                let suffix = 1;
                let newUsername = username + suffix;

                while(takenUsernames.includes(newUsername)){ //keep incrimenting the suffix until a unique username is found
                    suffix++;
                    newUsername = username + suffix;
                }

                return newUsername;
            }
        }
        catch(e){
            console.log("failed reading Accounts.txt: " + e);
            return null;
        }
    }
    else {//if file does not exist Username is free
        return username;
    }
    
}

function ValidateEmail(email){
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

module.exports={ValidateSignUp,ValidateLogin,ValidateUserName,ValidateEmail};
//If valid, respond with true, otherwise a reason why not