/**
 * @author Ben Judson
 * @program Navigate the buttons on the Edit Account page and send account edits to the server
 * @date 2025-10-05
 */


//let server = "http://localhost:3000";
let myAccount;

$(document).ready(()=>{ //on DOM content loaded (but with JQuery :)  )
    retrieveUserInformation();
    $("#cancelBTN").on("click",OnCancel);
    $("#saveBTN").on("click",OnSave);
    $("#editPictureBTN").on("change",updateProfilePicture);
})

function retrieveUserInformation(){
    $.ajax({ //populate account values
        url: server + "/api/account",
        type: "GET",
        dataType: "json",
        success: (res)=>{
            $("#emailInput").val(res.email);
            $("#usernameInput").val(res.username);
            myAccount = {
                username: res.username,
                email:res.email,
                profilePicture:res.profilePicture
            }
        if(myAccount.profilePicture!=undefined && myAccount.profilePicture!=null &&myAccount.profilePicture!=""){
            if(myAccount.profilePicture.includes("https")){ //if the profile picture is a url
                $("#profilePicture").attr("src", myAccount.profilePicture);
            } else {
                $("#profilePicture").attr("src","/users/pictures/"+myAccount.profilePicture);
            }
        }
        },
        error: (err)=>{
            console.log(err.responseText);
        }
    }); 
}
function OnCancel(){
    window.location.replace(server+"/account");
}

function updateProfilePicture(event){
    const file = event.target.files[0];
    if(file){
        const imageUrl = URL.createObjectURL(file);
        $("#profilePicture").attr('src', imageUrl);
    }
}

function OnSave(){
    let newUsername = $("#usernameInput").val();
    let newEmail = $("#emailInput").val();
    let newPassword = $("#passwordInput").val();
    let newPassword2 = $("#password2Input").val();
    let newPicture = $("#editPictureBTN")[0].files[0];

    let formData = new FormData();

    if(newUsername!==myAccount.username){
        formData.append("username", newUsername);
    }
    if(newEmail!==myAccount.email){
        formData.append("email", newEmail);
    }
    if(newPassword===newPassword2 && newPassword){ //if the passwords match and are not empty
        formData.append("password", newPassword);
        formData.append("password2", newPassword2);
    }
    else if(newPassword){
        $("#saveResponse").html("Passwords do not match");
        $("#saveResponse").css('color', 'red');
        return;
    }
    if(editPictureBTN){
        formData.append("profilePicture", newPicture);
    }

    $.ajax({
        url: server+"/api/account/edit",
        type: "PATCH",
        processData:false,
        contentType: false,
        data: formData,
        success:(res)=>{
            if(newUsername!==myAccount.username){
                localStorage.setItem('idleUsername', newUsername);
            }
            $("#saveResponse").html(res);
            $("#saveResponse").css('color', 'green');
            setTimeout(()=>{
                window.location.replace(server+"/account");
            }, 100);
        },
        error: (err)=>{
            console.log(err.responseText);
            $("#saveResponse").html(err.responseText);
            $("#saveResponse").css('color', 'red');
        }
    });
}