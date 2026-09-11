const express = require("express");
const path = require('path');
const serverBase = path.join(__dirname,".."); //points to server directory
const ValidateUserInfo = require(serverBase+'/private/scripts/ValidateUserInfo');
const models = require(serverBase+'/private/scripts/dataModels');
const multer = require('multer');
const fs = require('fs');
const directorys = {
    profilePicturesPath:path.join(serverBase,'private','uploads','profilePictures')
}
const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(serverBase, directorys.profilePicturesPath));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // .png, .jpg
        const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    }
})
const uploadPfp = multer({storage:profilePictureStorage}); //converts multipart files from text to files for profile pictures
const upload = multer({dest:path.join(serverBase, directorys.profilePicturesPath)}); //converts multipart files from text to files


function isAuthenticated(req){
    if(req===undefined){
        console.warn("Programming error. Please provide (req) in isAuthenticated");
        return false; //prevents crash, does not allow access
    }
    return !!req.session.user;
}
function send401(req,res){
    res.status(401);
    res.redirect("/home");
}

module.exports = function(userAccounts, Game){
    const router = express.Router();
    const PFP_NAME = /^\d+-\d+\.(png|jpg|jpeg)$/i;

    // new protection for pfp errors
    router.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).send(`Upload error: ${err.code} (field: ${err.field})`);
        }
        next(err);
    });

    router.patch("/api/account/edit",uploadPfp.single("profilePicture"),
    async (req, res, next) => {
        if(!isAuthenticated(req)){
            send401(req,res);
            return;
        }
        if(!req.body){
            res.status(400);
            res.send("No information provided");
            return;
        }
        if(req.body.username){ //if the username is being changed
            let validatedUsername = await ValidateUserInfo.ValidateUserName(req.body.username);
            if(validatedUsername!==req.body.username){ //if the username is taken
                res.status(400); //bad request
                res.send("That username is already in use");
                return;
            }
        }
        if(req.body.email){ //if the email is being changed
            let validEmail = await ValidateUserInfo.ValidateEmail(req.body.email);
            if(validEmail!==true){ //if email is taken or not valid
                res.status(400);//bad request
                res.send(validEmail);
                return;
            }
        }
        if(req.body.password){ //if password is changing
            if(req.body.password !== req.body.password2){
                res.status(400);//bad request
                res.send("Passwords do not match");
                return;
            }
            else if(req.body.password.length < 5){
                res.status(400);//bad request
                res.send("Password must be more than 5 characters");
                return;
            }
        }
        next();
    },async (req,res)=>{
        if(isAuthenticated(req)){
            const username=req.session.user;
            // let account = await userAccounts.findOne({username:username})
            let updatedAccount = {};
            if(req.body.username){ //if username is changed
                updatedAccount.username = req.body.username;
                if(Game.GetGame(req.session.user)){ //if there is a game happening
                    Game.GetGame(req.session.user).userAccount.username=req.session.user; //change the active game
                }
                req.session.user = req.body.username;
            }
            if(req.body.email){
                updatedAccount.email = req.body.email;
            }
            if(req.body.password){
                const hashedPassword = await models.UserModel.hashPassword(req.body.password);
                updatedAccount.password = hashedPassword.hashedPassword;
                updatedAccount.salt = hashedPassword.salt;
            }
            if(req.file){
                if(path.extname(req.file.originalname)=='.png' || path.extname(req.file.originalname)=='.jpg'){ //if the pfp is valid format
                    let userAccount = await userAccounts.userAccounts.findOne({username:username});
                    if(fs.existsSync(path.join(directorys.profilePicturesPath, userAccount.pfp))){
                        fs.unlink(path.join(directorys.profilePicturesPath, userAccount.pfp),()=>{
                        })
                    }
                    updatedAccount.pfp = req.file.filename;
                }
            }
            await userAccounts.userAccounts.updateOne({username:username},{$set:updatedAccount});
        }
        else{
            send401(req,res); //unauthorized
            return;
        }
        res.status(204).end();//updated succesfully
        return;
    })


    router.route("/api/account").get(async (req,res)=>{
        const username = req.session.user;
        if(isAuthenticated(req)){ //if user has a session
            let account = await userAccounts.userAccounts.findOne({username:username});
            if(account &&req.session.user==account.username){ //if the session user is requesting their own account
                let accountData = {
                    username: account.username, 
                    email: account.email,
                    profilePicture: account.pfp
                }
                res.status(200);
                res.send(JSON.stringify(accountData));
            }
            else{
                send401(req,res);
            }
        }
        else{
            send401(req,res);
        }
    });
    router.route("/api/account/logout").get((req,res)=>{
        if(req.session.user){
            let userGame = Game.GetGame(req.session.user);
            if(userGame){
                setTimeout(()=>{ //delay to ensure the game is properly saved before leaving
                    userGame.leaveGame("Logging out");
                }
                ,1000);
            }
            req.session.user = null;
            req.session.destroy();
            res.redirect("/");
        }
        else{
            send401(req,res);
        }
    })


    router.route("/users/pictures/:profilePicture").get((req, res) => {
        const name = req.params.profilePicture;

        if (!PFP_NAME.test(name)) {
            return res.sendStatus(400);
        }

        res.sendFile(name, {
            root: directorys.profilePicturesPath,
            dotfiles: "deny"
        }, (err) => {
            if (err && !res.headersSent) {
                res.sendStatus(err.status === 404 ? 404 : 500);
            }
        });
    });

    
    return router;
}
