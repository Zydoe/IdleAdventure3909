/**
 * @author Ben Judson
 * @program Navigate the buttons on the Account page
 * @date 2025-10-03
 */


//let server = "http://localhost:3000";
let myAccount;

$(document).ready(()=>{ //on DOM content loaded (but with JQuery :)  )
    //history.replaceState({},"","/account/"+localStorage.getItem("idleUsername"));
    retrieveUserInformation();
    $("#logoutBTN").on("click",logoutUser);
    $("#editBTN").on("click",editProfile);
})

function retrieveUserInformation(){
    $.ajax({ //populate account values
        url: server + "/api/account/" + localStorage.getItem("idleUsername"),
        type: "GET",
        dataType: "json",
        success: (res)=>{
            $("#emailDisplay").html(res.email);
            $("#usernameDisplay").html(res.username);
            if(res.profilePicture!=undefined && res.profilePicture!=null){
                $("#profilePicture").attr("src","/users/pictures/"+res.profilePicture);
            }
        },
        error: (err)=>{
            console.log(err.responseText);
            //window.location.replace("/");
        }
    });
}

function logoutUser(){
    $.ajax({
        url: server+"/api/account/logout/" +localStorage.getItem("idleUsername"),
        type: "GET",
        dataType: "html",
        error: (err)=>{
            console.log(err.responseText);
        },
        success:()=>{
            localStorage.removeItem("idleUsername");
            console.log("User Logged Out Successfully");
            window.location.replace("/");
        }
    })
}

function editProfile(){
    window.location.replace("/account/edit/"+localStorage.getItem("idleUsername"));
}