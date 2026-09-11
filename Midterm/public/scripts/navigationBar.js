/**
 * @author Ben Judson
 * @program Navigate the buttons on the top bar
 * @date 2025-10-08
 */

let server = "http://localhost:3000";

$(document).ready(()=>{
    $("#accountMenu").on("click",OnMyAccountClick);
    $("#howToPlayMenu").on("click",OnHowToPlayClick);
    $("#homeMenu").on("click",OnHomeClick)
    $("#playMenu").on("click",OnPlayClick)
})

function OnMyAccountClick(){
    window.location.href = (server+"/account/" + localStorage.getItem("idleUsername"));
}

function OnHowToPlayClick(){
    window.location.href = server + "/how-To-Play";
}

function OnHomeClick(){
    window.location.href = server + "/home";
}

function OnPlayClick(){
    window.location.href = server + "/game";
}