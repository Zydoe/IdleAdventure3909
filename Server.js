/**
 * @program: {Final Project, Express text adventure server}
 * @author: {Ben Judson}
 */
const express = require('express');
const fs = require('fs');
const hostname  = "IdleAdventure.benjudson.com";
const path = require('path');
let isLocal = false;
let userAccounts = {userAccounts:null}; //placeholder for database collection of user accounts, will be initialized on server start
//Game
const Game = require(path.join(__dirname,"private","scripts","Game")); //imports the Game class
const ValidateUserInfo = require(__dirname+'/private/scripts/ValidateUserInfo');
const user_routes = require(path.join(__dirname,'routes','user_routes'));
const api_routes = require(path.join(__dirname,'routes','api_routes'))(userAccounts, Game);
const models = require(__dirname+'/private/scripts/dataModels');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const dotenv = require ("dotenv");
dotenv.config();

//Database

const connectDatabase = require(path.join(__dirname,"private","scripts","ConnectDatabase"));

function logToFile(message) {
    // You may be asking yourself "Why?" this is because the public server I usually host on does not have a console for me to use. This is an edit for 3909
    console.log(message);
}


const multer = require('multer');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { error } = require('console');




const directorys = {
    accountsPath: path.join(__dirname,'private','users','accounts.json'),
    profilePicturesPath:path.join(__dirname,'private','uploads','profilepictures/'),
    iconPath:path.join(__dirname,"private","game","icons")
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

const app = express();

app.set(`view engine`, `pug`);
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname,"public"))); //Serves static files on request from the public folder

app.use(express.urlencoded({ extended: true })); //decodes url placeholders
app.use(express.json());

app.use(cookieParser(process.env.COOKIE_SECRET)); //Middleware for parsing cookies, with a secret for signing cookies

app.set("trust proxy", 1);

app.use(session({ //Middleware Sessions
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:{
        secure: isLocal,//change to true when switching to HTTPS
        maxAge:1000*60*60*24*7,/*Session expires after 7 days */
        sameSite: "lax",
        httpOnly: true
    }
}))
app.use(passport.initialize());
app.use(passport.session());
// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

//Google OAuth callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    let userAccount = await getUser(req.user.emails[0].value);
    if (!userAccount) { //creating user if they dont exist already
      userAccount = await ValidateUserInfo.CreateNewUser(req.user.displayName, null,null,req.user.emails[0].value,req.user.photos[0].value);
    }
    else{
        if(req.user.photos[0].value && req.user.photos[0].value!=userAccount.pfp){ //if the google profile picture is different from the current profile picture, update it to the google profile picture{
            userAccount.profilePicture = req.user.photos[0].value; //update profile picture to google profile picture on login
            await userAccounts.userAccounts.updateOne({username:userAccount.username},{$set:{pfp:req.user.photos[0].value}});
        }
    }
    req.session.user = userAccount.username; //on a valid login, give the session a user
    //res.cookie("sessionId",req.sessionID);
    res.redirect("/home");
  }
);

const ipConnections = new Map();
const MAX_CONNECTIONS_PER_IP = 20; // limit connections per router

app.use((req, res, next) => {
    const ip = req.ip;

    const count = ipConnections.get(ip) || 0;

    if (count >= MAX_CONNECTIONS_PER_IP) {
        return res.status(429).send("Too many connections from this IP");
    }

    ipConnections.set(ip, count + 1);

    // When the request finishes or connection closes, decrement
    const cleanup = () => {
        const current = ipConnections.get(ip) || 1;
        ipConnections.set(ip, current - 1);
    };

    res.on("close", cleanup);
    res.on("finish", cleanup);

    next();
});
//routing
app.use(user_routes);
app.use(api_routes);
function isAuthenticated(req){
    if(req===undefined){
        console.warn("Programming error. Please provide (req) in isAuthenticated");
        return false; //prevents crash, does not allow access
    }
    return !!req.session.user;
}

app.use("/formSubmit/signUp",async (req,res,next)=>{ //validating user input for creating an account
    req.body.email = req.body.email.toLowerCase(); //convert to lowercase
    let validation = await ValidateUserInfo.ValidateSignUp(req.body.email,req.body.password,req.body.password2);
    if(validation===true){
        next();
    }
    else{
        console.log("Sign Up attempt failed: Error Message: " + validation);
        res.end(JSON.stringify({error:validation}));
    }
})
app.use("/formSubmit/login",async (req,res,next)=>{ //validating user input for creating an account
    req.body.email = req.body.email.toLowerCase(); //convert to lowercase
    let validation = await ValidateUserInfo.ValidateLogin(req.body.email,req.body.password);
    if(validation===true){
        let userAccount = await getUser(req.body.email);
        req.session.user = userAccount.username; //on a valid login, give the session a user
        //res.cookie("sessionId",req.sessionID);
        console.log("New session with: " + req.session.user);
        logToFile("New session with: " + req.session.user);
        req.session.save(() => {
            next();
        });
    }
    else{
        //res.status(401); //Unauthorized - user did not provide valid login credentials
        console.log("Login attempt failed: Error Message: " + validation);
        logToFile("Login attempt failed: Error Message: " + validation);
        res.end(JSON.stringify({error:validation}));
    }
})

app.post("/formSubmit/login",(req,res)=>{ //Login the user
    res.send(JSON.stringify({message: "Login Successful!", redirect: "/home", username:req.session.user}));
})
app.post("/formSubmit/signUp",async (req,res)=>{ //Sign up handler
    //assume the info is not garbage
    let UserEmail = req.body.email;
    let UserPassword = req.body.password.toString();
    let UserUsername = await ValidateUserInfo.ValidateUserName(UserEmail.split('@')[0].replace('.','-'));
    // let newAccount = {//adding a new account to the database
    //     email:UserEmail,
    //     password:UserPassword,
    //     gameKey:null,
    //     username: UserUsername,
    //     pfp:""
    // }; 

    // await userAccounts.insertOne(newAccount);
    await ValidateUserInfo.CreateNewUser(UserUsername, UserPassword,null,UserEmail,null);
    console.log("Created new account for " + UserUsername);
    logToFile("Created new account for " + UserUsername);

    res.send(JSON.stringify({Message:"Account Creation Successful!"}));
})


app.get("/game", async(req,res)=>{
    if(isAuthenticated(req)){
        const tab = req.query.tab;
        const action = req.query.action;
        let usersGame = Game.GetGame(req.session.user);
        if(tab && usersGame){ //if there is an active game, and an open tab
            usersGame.sendTabData(tab,res);
        }
        else if(action && usersGame){ //if there is an active game and user has submitted an action
            usersGame.performAction(action);
            res.end();
        }
        else{
            let userAccount = await getUserAccount(req.session.user);
            if(userAccount.gameKey || req.session.hasCharacter){
                req.session.hasCharacter = undefined;
                res.sendFile(__dirname+"/public/game.html"); //otherwise if there is no game yet and the user has a game, send the game page
            }
            else{
                res.redirect('/game/characterCreator');
            }
        }
    }
    else{
        send401(req,res);
    }
})
app.get("/game/playGame",async (req,res)=>{
    if(isAuthenticated(req)){
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        let username = req.session.user;
        let usersGame;
        if(Game.GetGame(username)){//if the user has an active game
            usersGame = Game.GetGame(username);
            usersGame.SSEResponse = res;
            usersGame.sendRoomDetails();
        }
        else{
            let userAccount = await getUserAccount(username);
            usersGame = await Game.StartGame(userAccount,res);
        }
        usersGame.updateCharacterInfo();
        usersGame.updateInventoryInfo();
        usersGame.updateUserActions();
        res.on('close',()=>{
            usersGame.saveGame();
            res.end();
        });
    }
    else{
        send401(req,res);
    }
})
app.post("/game/newCharacter",async (req,res)=>{
    if(isAuthenticated(req)){
        let newCharacter = req.body;
        Game.AddNewCharacterQueue(req.session.user, newCharacter);
        req.session.hasCharacter = true;
        res.send("/game",200)

    }
})

app.use("/game/icons", express.static(path.join(directorys.iconPath)));


app.use((req,res)=>{ //404 middleware
    send404(req,res);
})
app.use((err,req,res,next)=>{ //500 Middleware
    console.log(err);
    send500(req,res);
})
app.listen(process.env.PORT || 3000,()=>{
    initializeDatabase();
    Game.initializeServer();
    console.log("Server has started... Listening on port: " + (process.env.PORT || 3000));
});






function send401(req,res){
    res.status(401);
    res.redirect("/home");
}
function send404(req,res){ //404 handler
    res.status(404);
    res.sendFile(__dirname+"/public/404.html");
}
function send500(req,res){ //500 Handler
    res.status(500);
    res.sendFile(__dirname+"/public/500.html");
}

/**
 * @function getUser | Access User Information with the Email Key
 * @param {The email associated with the User account requested} email 
 * @returns {Object: User Account from the database} object
 */
async function getUser(email){
    if(!email) return null;
    let account = await userAccounts.userAccounts.findOne({email:email})
    if(!account) return null;
    let accountObject = {
        username: account.username,
        email: account.email,
        gameKey: account.gameKey,
        pfp: account.pfp
    }
    return accountObject;
}
/**
 * @function getUserAccount | Access User Information with the Username Key
 * @param {The username of the requested account} username 
 * @returns {Object: User Account from the database} object
 */
async function getUserAccount(username){
    if(!username) return null;
    let account = await userAccounts.userAccounts.findOne({username:username});
    if(!account) return null;
    let accountObject = {
        username: account.username,
        email: account.email,
        gameKey: account.gameKey,
        pfp: account.pfp
    }
    return accountObject;
}

async function initializeDatabase(){
    const db = await connectDatabase();
    userAccounts.userAccounts = await db.collection("User");
}