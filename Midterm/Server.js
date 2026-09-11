/**
 * @program: {Midterm Project, Express text adventure server}
 * @author: {Ben Judson}
 */
const express = require('express');
const fs = require('fs');
const hostname  = "localhost";
const path = require('path');
const ValidateUserInfo = require(__dirname+'/private/scripts/ValidateUserInfo');
const Game = require(path.join(__dirname,"private","scripts","game")); //imports the Game class
const multer = require('multer');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const directorys = {
    accountsPath: __dirname + "/private/users/accounts.txt",
    profilePicturesPath: __dirname + "/private/uploads/profilepictures/"
}

const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "private/uploads/profilepictures"));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // .png, .jpg
        const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    }
})
const uploadPfp = multer({storage:profilePictureStorage}); //converts multipart files from text to files for profile pictures
const upload = multer({dest:__dirname+"/private/uploads/"}); //converts multipart files from text to files
let usersGame;

const port  = 3000;
const app = express();

app.use(express.static(path.join(__dirname,"public"))); //Serves static files on request from the public folder

app.use(express.urlencoded({ extended: true })); //decodes url placeholders
app.use(express.json());

app.use(cookieParser());


app.use(session({ //Middleware Sessions
    secret: "InternetProgramming3909",
    resave: false,
    saveUninitialized: false,
    cookie:{secure:false,maxAge:1000*60*60*24/*Session expires after 24 hours */}//change to true when switching to HTTPS
}))

function isAuthenticated(req){
    if(req===undefined){
        console.log("Programming error. Please provide (req) in isAuthenticated");
    }
    return !!req.session.user;
}

app.use("/formSubmit/signUp",(req,res,next)=>{ //validating user input for creating an account
    req.body.email = req.body.email.toLowerCase(); //convert to lowercase
    let validation = ValidateUserInfo.ValidateSignUp(req.body.email,req.body.password,req.body.password2);
    if(validation===true){
        next();
    }
    else{
        console.log("Sign Up attempt failed: Error Message: " + validation);
        res.end(JSON.stringify({error:validation}));
    }
})
app.use("/formSubmit/login",(req,res,next)=>{ //validating user input for creating an account
    req.body.email = req.body.email.toLowerCase(); //convert to lowercase
    let validation = ValidateUserInfo.ValidateLogin(req.body.email,req.body.password);
    if(validation===true){
        req.session.user=getUser(req.body.email).username; //on a valid login, give the session a user
        res.cookie("sessionId",req.sessionID);
        console.log("New session with: " + req.session.user);
        next();
    }
    else{
        //res.status(401); //Unauthorized - user did not provide valid login credentials
        console.log("Login attempt failed: Error Message: " + validation);
        res.end(JSON.stringify({error:validation}));
    }
})
app.use("/api/account/edit/:username",uploadPfp.single("profilePicture"),(req,res,next)=>{ //verify's information validity when attempting to update user account
    if(req.body.username){ //if the username is being changed
        if(ValidateUserInfo.ValidateUserName(req.body.username)!==req.body.username){ //if the username is taken
            res.status(400); //bad request
            res.send("That username is already in use");
            return;
        }
    }
    if(req.body.email){ //if the email is being changed
        if(ValidateUserInfo.ValidateEmail(req.body.email)!==true){ //if email is taken or not valid
            res.status(400);//bad request
            res.send(ValidateUserInfo.ValidateEmail(req.body.email));
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
})
app.post("/formSubmit/login",(req,res)=>{ //Login the user
    res.send(JSON.stringify({message: "Login Successful!", redirect: "/home", username:req.session.user}));
})
app.post("/formSubmit/signUp",(req,res)=>{ //Sign up handler
    //assume the info is not garbage
    let accountsPath = directorys.accountsPath;
    let UserEmail = req.body.email;
    let UserPassword = req.body.password;

    let newAccount = {email:UserEmail,password:UserPassword,gameKey:null,username: ValidateUserInfo.ValidateUserName(UserEmail.split('@')[0].replace('.','-')),pfp:""}; //adding a new account to the file
    if(fs.existsSync(accountsPath)){
        let accounts = JSON.parse(fs.readFileSync(accountsPath));
        accounts.push(newAccount);
        fs.writeFileSync(accountsPath,JSON.stringify(accounts,null,2));
        console.log("Created new Account for: " + newAccount.email);
    }
    else{
        let accounts = [];
        accounts.push(newAccount);
        fs.writeFileSync(accountsPath,JSON.stringify(accounts,null,2));
        console.log("Created new Account for: " + newAccount.email);
    }

    res.send(JSON.stringify({Message:"Account Creation Successful!"}));

    //fs.appendFile(__dirname+"/private/users/Accounts.txt",JSON.stringify(newAccount)+",\n",(err)=>{console.log("Account Created for: " + newAccount.email + "\nErrors: " +err)})
    
    //let writeStream = fs.appendFile(__dirname+"/private/users/Accounts.txt",//data here);
})

app.get("/index",(req,res)=>{
    res.sendFile(__dirname+"/public/index.html");
})
app.get("/home",(req,res)=>{
    if(!isAuthenticated(req)){ //If no user session exists send to front page
        res.redirect("/");
    }   
    else{
        res.sendFile(__dirname+"/public/home.html");
    }
})
app.get("/getUsername",(req,res)=>{ //lets the client know if a session exists for them or not
    if(isAuthenticated(req)){
        res.send(JSON.stringify({redirect:"/home"}));
    }
    else{
        res.send(JSON.stringify({error:"No session found"}));
    }
})
app.get("/how-to-play",(req,res)=>{
    res.sendFile(__dirname+"/public/howToPlay.html");
})

app.get("/game",(req,res)=>{
    if(isAuthenticated(req)){
        const tab = req.query.tab;
        const action = req.query.action;
        if(tab && usersGame){ //if there is an active game, and an open tab
            usersGame.sendTabData(tab,res);
        }
        else if(action && usersGame){
            usersGame.performAction(action);
            res.end();
        }
        else{
            res.sendFile(__dirname+"/public/game.html");
        }
    }
    else{
        send401(req,res);
    }
})
app.get("/game/playGame",(req,res)=>{
    if(isAuthenticated(req)){
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        usersGame = new Game(getUserAccount(req.session.user),res);
        usersGame.updateCharacterInfo();
        usersGame.sendRoomDetails();
        res.on('close',()=>{
            usersGame.saveGame();
            res.end();
        });
    }
    else{
        send401(req,res);
    }
})
app.get("/account/:username",(req,res)=>{
    if(isAuthenticated(req)){
        res.sendFile(__dirname+"/public/account.html");
    }
    else{
        send404(req,res);
    }
})
app.get("/api/account/:username",(req,res)=>{ //api for retrieving user information by comparing username in route parameter 
    let accountsFilePath=directorys.accountsPath;
    if(isAuthenticated(req)){ //if user has a session
        let account;
        if(fs.existsSync(accountsFilePath)){ //if accounts.txt exists
            const username = req.params.username;
            if(req.session.user==username){ //if the session user is requesting their own account
                fs.readFile(accountsFilePath,(err,userFiles)=>{
                    userFiles=JSON.parse(userFiles.toString());
                    for(let i=0;i<userFiles.length;i++){
                        if(userFiles[i].username===username){ //find the user
                            account = {
                                username: userFiles[i].username,
                                email: userFiles[i].email,
                                profilePicture: userFiles[i].pfp
                            }
                            break;
                        }
                    }
                    if(account.username==undefined){ //if no user was found
                        res.status(404);
                        res.send("No user found with username: " + username);
                    }
                    else{ //if the account information was retrieved
                        res.status(200);
                        res.send(JSON.stringify(account));
                    }
                });
            }
        }
        else{
            res.status(404);
            res.send(JSON.stringify("Accounts file not found"))
        }
    }
    else{
        res.status(404);
        res.send(JSON.stringify("No Session Found"));
    }
    
})
app.get("/api/account/logout/:username",(req,res)=>{
    if(req.session.user==req.params.username){
        req.session.destroy();
        res.redirect("/");
    }
    else{
        res.status(401);
        res.send("Not logged in as: " + req.params.username);
    }
})
app.get("/account/edit/:username",(req,res)=>{
    res.sendFile(path.join(__dirname,"public","editAccount.html"));
})
app.get("/users/pictures/:profilePicture",(req,res)=>{
    res.sendFile(directorys.profilePicturesPath+req.params.profilePicture);
})

app.patch("/api/account/edit/:username",(req,res)=>{ //Changes user accounts to new values
    accounts = JSON.parse(fs.readFileSync(directorys.accountsPath));
    for(let i=0;i<accounts.length;i++){
        if(accounts[i].username===req.params.username){ //find account
            if(req.body.username){ //if username is changed
                accounts[i].username = req.body.username;
                req.session.user = req.body.username;
            }
            if(req.body.email){
                accounts[i].email = req.body.email;
            }
            if(req.body.password){
                accounts[i].password = req.body.password;
            }
            if(req.file){
                if(path.extname(req.file.originalname)=='.png' || path.extname(req.file.originalname)=='.jpg'){ //if the pfp is valid format
                    if(fs.existsSync(directorys.profilePicturesPath+accounts[i].pfp)){
                        fs.unlink(directorys.profilePicturesPath+accounts[i].pfp,()=>{
                        })
                    }
                    accounts[i].pfp = req.file.filename;
                }
            }
            
            fs.writeFileSync(directorys.accountsPath,JSON.stringify(accounts,null,2),{});

            res.status(204);//updated succesfully
            res.send("Update succesful");
            return;
        }
    }
    res.status(404);
    res.send("could not find account ");
})

app.use((req,res)=>{ //404 middleware
    send404(req,res);
})
app.use((err,req,res,next)=>{ //500 Middleware
    console.log(err);
    send500(req,res);
})

app.listen(port,hostname,()=>{
    console.log("Server has started... Listening on port: " + port);
});

function send401(req,res){
    res.status(401);
    res.redirect("/");
}
function send404(req,res){ //404 handler
    res.status(404);
    res.sendFile(__dirname+"/public/404.html");
}
function send500(req,res){ //500 Handler
    res.sendFile(__dirname+"/public/500.html");
}

/**
 * @function getUser | Access User Information with the Email Key
 * @param {The email associated with the User account requested} email 
 * @returns {Object: User Account from the database} object
 */
function getUser(email){
    let accountPath = directorys.accountsPath;
    if(fs.existsSync(accountPath)){
        try{
            let accounts = JSON.parse(fs.readFileSync(accountPath))
            for(let i=0;i<accounts.length;i++){
                if(accounts[i].email == email){
                    accountObject = {
                        username: accounts[i].username,
                        email: accounts[i].email,
                        gameKey: accounts[i].gameKey,
                        pfp: accounts[i].pfp
                    }
                    return accountObject;
                }
            }
        }
        catch(e){
            console.log("Problem retreiving accounts: "+e);
        }
    }
}
/**
 * @function getUserAccount | Access User Information with the Username Key
 * @param {The username of the requested account} username 
 * @returns {Object: User Account from the database} object
 */
function getUserAccount(username){
    let accountPath = directorys.accountsPath;
    if(fs.existsSync(accountPath)){
        try{
            let accounts = JSON.parse(fs.readFileSync(accountPath))
            for(let i=0;i<accounts.length;i++){
                if(accounts[i].username == username){
                    accountObject = {
                        username: accounts[i].username,
                        email: accounts[i].email,
                        gameKey: accounts[i].gameKey,
                        pfp: accounts[i].pfp
                    }
                    return accountObject;
                }
            }
        }
        catch(e){
            console.log("Problem retreiving accounts: "+e);
        }
    }
}