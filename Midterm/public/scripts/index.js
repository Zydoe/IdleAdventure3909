/**
 * @author Ben Judson
 * @program login to the website or create an account
 * @date 2025-09-25
 */
document.addEventListener("DOMContentLoaded",init);
console.log("index.js loaded");
let allForms;

let server = "http://localhost:3000";

// Initialize on load
function init(){
    fillForms();
    //logInNavButton().addEventListener("click",toggleForm.bind(null, "#loginForm"));
    $("#loginMenu").on("click",loginMenuOnClick);
    //signUpNavButton().addEventListener("click",toggleForm.bind(null, "#signUpForm"));
    $("#signUpMenu").on("click",()=>toggleForm("#signUpForm"));
    //signUpLink().addEventListener("click",toggleForm.bind(null, "#signUpForm"));
    $("#signUpLink").on("click",()=>toggleForm("#signUpForm"));
    //playNowButton().addEventListener("click",toggleForm.bind(null,"#loginForm"));
    $("#playNowButton").on("click",loginMenuOnClick);
    handleLoginFormSubmit();
    handleSignUpSubmit();
 }

// function logInNavButton(){ //OBSELETE
//     return document.body.querySelector("#loginMenu");
// }
// function signUpNavButton(){
//     return document.body.querySelector("#signUpMenu");
// }
// function signUpLink(){
//     return document.body.querySelector("#signUpLink");
// }
// function playNowButton(){
//     return document.body.querySelector("#playNowButton");
// } //OBSELETE WITH JQUERY

function handleLoginFormSubmit(){
    $("#loginSubmitBTN").on("click",function(event){
        event.preventDefault();
        $("#loginError").html("");
        let email = $("#emailTextArea").val();
        let pass = $("#passwordTextArea").val();

        //Post with AJAX
        $.post(server+"/formSubmit/login",{
            email:email,
            password:pass
        },function(response){
            response=JSON.parse(response);
            console.log(response);
            if(response.error!=undefined){
                $("#loginError").html(response.error);
            }
            else{//If there is no error
                console.log(response.message);
                localStorage.setItem("idleUsername",response.username);
                $("#emailTextArea").val("");
                $("#passwordTextArea").val("");
                hideAllForms();
                window.location.replace(server+response.redirect);
            } 
        })
    })
}

function handleSignUpSubmit(){
    $("#signUpSubmitBTN").on("click",function(event){
        event.preventDefault();
        $("#signUpError").html("");
        //let email = encodeURIComponent($("#CemailTextArea").val());
        let email = $("#CemailTextArea").val();
        let password = encodeURIComponent($("#CpasswordTextArea").val());
        let password2 = encodeURIComponent($("#Cpassword2TextArea").val());

        $.post(server+"/formSubmit/signUp",{
            email:email,
            password,password,
            password2:password2
        },function(response){
            response=JSON.parse(response);
            if(response.error!=undefined){
                $("#signUpError").html(response.error);
            }
            else{
                console.log(response.message);
                $("#CemailTextArea").val("");
                $("#CpasswordTextArea").val("");
                $("#Cpassword2TextArea").val("");
                hideAllForms();
                toggleForm("#loginForm");
            }
            
        })
    })
}
/**
 * @function toggleForm If the selected form is on, all forms turn off. Otherwise all forms turn off and turn on selected form
 * @param {*} formID 
 */
function toggleForm(formID){
    let form = document.body.querySelector(formID);
    if(form.style.display=="none" || form.style.display==""){
        hideAllForms();
        form.style.display="flex";
    }
    else{
        hideAllForms();
    }
}

function hideAllForms(){
    for(let i=0;i<allForms.length;i++){
        allForms[i].style.display="none";
    }
}

function fillForms(){
    allForms = document.querySelectorAll(".toggleForm");
    for(let i=0;i<allForms.length;i++){
        allForms[i].querySelector(".closeFormButton").addEventListener("click",hideAllForms);
    }
}

function loginMenuOnClick(){
    $.get(server+"/getUsername",{

    },function (response){
        response=JSON.parse(response);
        if(response.redirect){
            window.location.replace(server+response.redirect);
        }
        else{
            toggleForm("#loginForm");
        }
    })
}