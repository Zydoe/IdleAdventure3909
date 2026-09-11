/**
 * @program: {Final Project, Express text adventure server}
 * @author: {Ben Judson}
 */
const express = require("express");
const router = express.Router();
const path = require('path');
const serverBase = path.join(__dirname,".."); //points to server directory

function isAuthenticated(req){
    if(req===undefined){
        console.warn("Programming error. Please provide (req) in isAuthenticated");
        return false; //prevents crash, does not allow access
    }
    return !!req.session.user;
}

router.route("/").get((req,res)=>{
    res.redirect("/index");
})
router.route("/index").get((req,res)=>{
    res.render(path.join(serverBase,"index"),{
        loginInputs:[
            {id: 'emailTextArea', label: 'Email:', type: 'text', name: 'email'},
            {id: 'passwordTextArea', label: 'Password:', type: 'password', name: 'password'}
        ],
        signUpInputs:[
            {id: 'CemailTextArea', label: 'Email:', type: 'text', name: 'email', placeholder: 'bob@mcbobface.mail'},
            {id: 'CpasswordTextArea', label: 'Password:', type: 'password', name: 'password', placeholder: 'S3cURe!'},
            {id: 'Cpassword2TextArea', label: 'Re-enter Password:', type: 'password', name: 'password2', placeholder: '......'}
        ]
    });
})
router.route("/home").get((req,res)=>{
    if(!isAuthenticated(req)){ //If no user session exists send to front page
        res.redirect("/");
    }   
    else{
        res.sendFile(path.join(serverBase,"public","home.html"));
    }
})

router.route("/getUsername").get((req,res)=>{ //lets the client know if a session exists for them or not
    if(isAuthenticated(req)){
        res.send(JSON.stringify({redirect:"/home"}));
    }
    else{
        res.send(JSON.stringify({error:"No session found"}));
    }
})
router.route("/how-to-play").get((req,res)=>{
    res.sendFile(path.join(serverBase,"public","howToPlay.html"))
})

router.route("/about").get((req,res)=>{
    res.sendFile(path.join(serverBase,"public","about.html"))
})


router.route("/game/characterCreator").get(async (req,res)=>{
    if(isAuthenticated(req)){
        res.sendFile(path.join(serverBase,"public","characterCreator.html"))
    }
})

router.route("/account").get((req,res)=>{
    if(isAuthenticated(req)){
        res.sendFile(serverBase+"/public/account.html");
    }
    else{
        send401(req,res);
    }
})
router.route("/account/edit").get((req,res)=>{
    if(isAuthenticated(req)){
        res.sendFile(path.join(serverBase,"public","editAccount.html"));
    }
    else{
        send401(req,res);
    }
})
function send401(req,res){
    res.status(401);
    res.redirect("/home");
}
module.exports = router;