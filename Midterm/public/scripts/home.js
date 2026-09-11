/**
 * @author Ben Judson
 * @program Navigate the buttons on the Home page
 * @date 2025-10-03
 */

//let server = "http://localhost:3000";

$(document).ready(()=>{ //on DOM content loaded (but with JQuery :)  )
    $("#PlayNowBTN").on("click",playNow);
    $("#MyAccountBTN").on("click",OnMyAccountClick);
    $("#HowToPlayBTN").on('click',OnHTPClick)
})

function playNow(event){
    window.location.href = (server+"/game");
}
function OnMyAccountClick(){
    window.location.href = (server+"/account/" + localStorage.getItem("idleUsername"));
}
function OnHTPClick(){
    window.location.href = server + "/how-to-play";
}