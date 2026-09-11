/**
 * @author Ben Judson
 * @program Navigate the buttons on the Game page
 * @date 2025-10-03
 */

const server = "http://localhost:3000";
const eventSourceURL = "/game/playGame";
$(document).ready(()=>{ //on DOM content loaded (but with JQuery :)  )
    $("#hamburgerMenuBTN").on("click",toggleHamburgerMenu);
    //Server Sent Events
    const evtSource = new EventSource(eventSourceURL);
    evtSource.addEventListener("newMessage",pushMessage);
    evtSource.addEventListener("updateCharacterData",updateCharacterData);
    
    //Hamburger Buttons
    $("#accountBTN").on('click',()=>{window.location.href="/account/"+localStorage.getItem("idleUsername")});
    $("#howToPlayBTN").on('click',()=>{window.location.href="/how-to-play"});
    $("#downloadSaveBTN").on('click',()=>{window.location.href="/downloadSave"});
    
    //Tab Buttons
    $('#characterBTN').on('click',()=>switchTab("#characterBTN"));
    $('#itemBTN').on('click',()=>switchTab("#itemBTN"));
    $('#abilityBTN').on('click',()=>switchTab("#abilityBTN"));
    $('#questsBTN').on('click',()=>switchTab("#questsBTN"));

    //Game Input
    $('#gameInput').on('keydown',sendAction);
})

function pushMessage(event){
    $("#gameInput").after(event.data);
}

function toggleHamburgerMenu(){
    $("#hamburgerList").toggleClass('active');
}

function sendAction(event){
    if(event.key === "Enter" && $('#gameInput').val()!=""){
        let action = $('#gameInput').val();
        console.log("Performing action: " + action);
        $('#gameInput').val(""); //clear input

        $.ajax({
            url:`/game?action=${action}`
        })
    }
}

function switchTab(tabID){
    const $tab = $(tabID);
    disableTabs();
    $tab.toggleClass('active',true); //makes tab button appear "clicked"
    let activeTab = $tab.data('tab');

    $.ajax({ //send tab query to server
        url: `/game?tab=${encodeURIComponent(activeTab)}`,
        success: function(res){
            res = JSON.parse(res);
            switch(activeTab){
                case "Character": displayCharacterData(res);
                break;
                case "Items": displayItemData(res);
                break;
                case "Abilities": displayAbilityData(res);
                break;
                case "Quests": displayQuestData(res);
                break;
            }
        }
    })
}


function disableTabs(){
    $('#characterBTN').toggleClass('active', false);
    $("#characterTab").toggleClass('active', false);
    $('#itemBTN').toggleClass('active', false);
    $("#itemsTab").toggleClass('active', false);
    $('#abilityBTN').toggleClass('active', false);
    $("#abilitiesTab").toggleClass('active', false);
    $('#questsBTN').toggleClass('active', false);
    $("#questsTab").toggleClass('active', false);
}

function displayCharacterData(data){
    let tabContainer = $("#characterTab");
    tabContainer.toggleClass('active',true);
    updateCharacterData(data);
}
function displayItemData(){
    let tabContainer = $("#itemsTab");
    tabContainer.toggleClass('active',true);
}
function displayAbilityData(){
    console.log("display abilitys")
    let tabContainer = $("#abilitiesTab");
    tabContainer.toggleClass('active',true);
}
function displayQuestData(){
    let tabContainer = $("#questsTab");
    tabContainer.toggleClass('active',true);
}



function updateCharacterData(data){
    if(data.data){ //if the method is called from the update event
        data = JSON.parse(data.data); //parse event data
    }

    $("#levelSpan").html(data.stats.level);
    $("#healthSpan").html(`${data.stats.health}/${data.stats.maxHealth}`);
    $("#staminaSpan").html(`${data.stats.stamina}/${data.stats.maxStamina}`);
    $("#strengthSpan").html(data.stats.strength);
    $("#dexteritySpan").html(data.stats.dexterity);
    $("#faithSpan").html(data.stats.faith);
    $("#luckSpan").html(data.stats.luck);
}
