/**
 * @author Ben Judson
 * @program Navigate the buttons on the Game page
 * @date 2025-10-03
 */

const server = "";
const eventSourceURL = "/game/playGame";
let contextMenuTarget = null;
let evtSource;

$(document).ready(()=>{ //on DOM content loaded (but with JQuery :)  )
    $("#hamburgerMenuBTN").on("click",toggleHamburgerMenu);
    //Server Sent Events
    evtSource = new EventSource(eventSourceURL);
    evtSource.addEventListener("newMessage",pushMessage);
    evtSource.addEventListener("updateCharacterData",updateCharacterData);
    evtSource.addEventListener("updateInventoryData",updateInventoryData);
    evtSource.addEventListener("updateActions",updateActions);
    evtSource.addEventListener("disconnect",serverDisconnect);
    //Hamburger Buttons
    $("#accountBTN").on('click',()=>{window.location.href="/account"});
    $("#howToPlayBTN").on('click',()=>{window.location.href="/how-to-play"});
    $("#aboutBTN").on('click',()=>{window.location.href="/about"});
    $("#logoutBTN").on('click',()=>{window.location.href="/api/account/logout"});
    
    //Tab Buttons
    $('#characterBTN').on('click',()=>switchTab("#characterBTN"));
    $('#itemBTN').on('click',()=>switchTab("#itemBTN"));
    $('#abilityBTN').on('click',()=>switchTab("#abilityBTN"));
    $('#questsBTN').on('click',()=>switchTab("#questsBTN"));

    //Game Input
    $('#gameInput').on('keydown',sendUserInput);
    
    document.addEventListener('mousemove',moveItemInfo);

    //Context menu
    $('#useBTN').on('click',OnUseBTN); //equips or unequips selected item
    $(document).on('click',()=>{ //turn off context menu when clicking
        $('#itemContextMenu').toggleClass('active',false);
    });

    $("#reconnectBTN").on('click',reconnect);
})

function serverDisconnect(event){
    console.log("Disconnected from server. Message: "+event.data);
    setTimeout(()=>{
        $(".disconnectedPopup").toggleClass('active',true);
        $("#disconnectedPopupMessage").html(event.data);
    }, 2000);
    
    evtSource.close();
}

function reconnect(){
    $("#disconnectedPopupMessage").html("Reconnecting...");
    setTimeout(()=>{
        window.location.reload();
    },1000);
}

function pushMessage(event){
    $("#gameInput").after(event.data);
}

function toggleHamburgerMenu(){
    $("#hamburgerList").toggleClass('active');
}

function sendUserInput(event){
    if(event.key === "Enter" && $('#gameInput').val()!=""){
        let action = $('#gameInput').val();
        $('#gameInput').val(""); //clear input

        if(action.trim()===""){
            return; //don't send empty actions
        }
        else if(action.length>100){
            return;
        }
        else if(action.toLowerCase()=="logout"){
            window.location.href = "/api/account/logout";
            return;
        }
        sendAction(action);
    }
}

function sendAction(action){
    $.ajax({
        url:`/game?action=${action}`
    })
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
function displayItemData(data){
    let tabContainer = $("#itemsTab");
    tabContainer.toggleClass('active',true);
    updateInventoryData(data);
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

    //Character Stats
    $("#levelSpan").html(data.stats.level);

    //****HEALTH*****
    $("#healthSpan").html(`${data.stats.health}/${data.stats.maxHealth}`); //update health text
    if(data.stats.health==data.stats.maxHealth){
        $("#healthSpan").css("color","#45d145");
    }
    else if(data.stats.health/data.stats.maxHealth>0.5){//change health text color based on how much health the player has
        $("#healthSpan").css("color","#12b612");
    }
    else if(data.stats.health/data.stats.maxHealth>0.25){
        $("#healthSpan").css("color","orange");
    }
    else{
        $("#healthSpan").css("color","red");
    }
    if(data.stats.health/data.stats.maxHealth<=0.1){
        $("#healthSpan").css("color","#8b0000");
        $("#healthSpan").toggleClass("grow-shrink", true);
    }
    else{
        $("#healthSpan").toggleClass("grow-shrink", false);
    }

    
    $("#staminaSpan").html(`${data.stats.stamina}/${data.stats.maxStamina}`);
    $("#strengthSpan").html(data.stats.strength);
    $("#dexteritySpan").html(data.stats.dexterity);
    $("#faithSpan").html(data.stats.faith);
    $("#luckSpan").html(data.stats.luck);

    //Equipped slots
    let equipmentSlots = $('.equipmentSlot');
    equipmentSlots.css("background-image", `url('/game/icons/inventorySlot.png')`); //set slot background

    // for(let i=0;i<equipmentSlots.length;i++){ //updating placeholders if empty
    //     if(!$(equipmentSlots[i]).html()){
    //         updatePlaceholder(equipmentSlots[i]);
    //     }
    // }


}
function updatePlaceholder(slot){
    let slotName = slot+"Slot";
    let equipmentSlot = $(`#${slotName}`);
    equipmentSlot.html("");

    let placeholder = $(`<div class='equipmentPlaceholder' id='${slotName}_placeholder'></div>`);
    if(slotName==='ring1Slot'||slotName==="ring2Slot"){
        slot='ring';
    }
    placeholder.css("background-image", `url('/game/icons/${slot}_placeholder.png')`);
    $(equipmentSlot).append(placeholder);
}


function updateInventoryData(data){ //if the method is called from the update event
    if(data.data){
        data = JSON.parse(data.data);
    }
    updateEquipmentSlots(data.equipped);
    $("#inventoryArea").html("");
    for(let i=0;i<data.maxInventorySlots;i++){ //add the max number of inventory slots to the space provided
        let slot = $(`<div class='inventorySlot' id='slot${i}'></div>`);
        slot.css("background-image", `url('/game/icons/inventorySlot.png')`);
        $("#inventoryArea").append(slot);

    }
    let inventorySlots = $(".inventorySlot");
    if(data.items){ //add items to the inventory slots
        for(let i=0;i<data.items.length;i++){
            if(data.items[i]){
                let item = $(`<div class='inventoryItem' id='item${i}'></div>`);
                item.css("background-image", `url('/game/icons/${data.items[i].itemKey}.png')`);
                $(inventorySlots[i]).append(item);
                item.data('item',data.items[i]);
                item.on(`dblclick`,()=>{ //Adding dbl click event to items
                    if(data.items[i].type==="weapon"||data.items[i].type==="armour"){
                        sendAction(`equip ${data.items[i].itemName}`)
                    }
                    else if(data.items[i].type==="consumable"){
                        sendAction(`consume ${data.items[i].itemName}`)
                    }
                    
                    hideItemInfo();
                })
                item.on('contextmenu',OnItemContextMenu);
            }
        }
    }
    if(data.currency || data.currency === 0){
        $("#currencyText").html(data.currency);
    }
    $('.inventoryItem').on('mouseenter',showItemInfo);
    $('.inventoryItem').on('mouseleave',hideItemInfo);
    hideItemInfo();
}

function updateEquipmentSlots(equipped) {
    const slots = ["head", "chest", "legs", "feet", "mainHand", "ring1", "ring2"];

    for(const slot of slots){
        const itemData = equipped[slot];
        if (!itemData){
            updatePlaceholder(slot);
        }
        else{
            const item = $(`<div class='inventoryItem' id='${slot}Item'></div>`);
            item.css("background-image", `url('/game/icons/${itemData.itemKey}.png')`);
            $(`#${slot}Slot`).empty().append(item); // Clear slot before appending
            item.data('item', itemData);
            item.data('item').isEquipped = true;
            item.on('mouseenter',showItemInfo)
            item.on('mouseleave',hideItemInfo)
            item.on('dblclick',()=>{
                sendAction(`unequip ${slot}`);
                hideItemInfo();
            })
            item.on('contextmenu',OnItemContextMenu);
        }
    };
    hideItemInfo();
}
function updateActions(event){
    $("#possibleActions").html("<h1 class='actionsHeader'>Actions</h1><p class='actionInfo'>Type one of the following available commands.</p>"); //Reset Actions
    let actions = JSON.parse(event.data);
    if(actions.directions.length!=0){
        $("#possibleActions").append("<h2 class='actionHeader'>Directions</h2>");
        actions.directions.forEach((direction)=>{
            $("#possibleActions").append(`<p class="actionText">${direction}</p>`);
        })
    }
    if(actions.passive.length!=0){
        $("#possibleActions").append("<h2 class='actionHeader'>Passive</h2>");
        actions.passive.forEach((action)=>{
            $("#possibleActions").append(`<p class="actionText">${action}</p>`);
        })
    }
    if(actions.items.length!=0){
        $("#possibleActions").append("<h2 class='actionHeader'>Items</h2>");
        actions.items.forEach((item)=>{
            $("#possibleActions").append(`<p class="actionText">${item}</p>`);
        })
    }
    if(actions.social.length!=0){
        $("#possibleActions").append("<h2 class='actionHeader'>Social</h2>");
        actions.social.forEach((interaction)=>{
            $("#possibleActions").append(`<p class="actionText">${interaction}</p>`);
        })
    }
    if(actions.combat.length!=0){
        $("#possibleActions").append("<h2 class='actionHeader'>Combat</h2>");
        actions.combat.forEach((interaction)=>{
            $("#possibleActions").append(`<p class="actionText">${interaction}</p>`);
        })
    }
    $(".actionText").on("click",function(){ //Performing action on button press
        sendAction($(this).html());
    })
}

function showItemInfo(e){
    let itemInfo = $("#itemInfo");
    $('#itemName').html(``); //clear itemName
    $('#itemDescription').html(``); //clear itemDescription
    $('#itemStatus').html(``); //clear itemStatus
    const item = $(this).data('item');
    $('#itemName').html(`<strong>${item.itemName}</strong>`); //Item Name
    $('#itemDescription').html(`${item.itemDescription}`); //Item Description
    if(item.type==="weapon"){ //Item Stats
        $('#itemStats').html(`Weapon:<br>&nbsp;&nbsp;&nbsp;&nbsp;Damage:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            ${item.weaponStats.damage}<br>&nbsp;&nbsp;&nbsp;&nbsp;Damage Type:&nbsp;&nbsp;&nbsp;&nbsp;${item.weaponStats.damageType}`);
    }
    else if(item.type==="armour"){
        $('#itemStats').html(`Armour:<br>&nbsp;&nbsp;&nbsp;&nbsp;Defence:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            ${item.armourStats.armour}<br>&nbsp;&nbsp;&nbsp;&nbsp;Armour Type:&nbsp;&nbsp;&nbsp;&nbsp;${item.armourStats.armourType}`);
    }
    else{
        $('#itemStats').html("");
    }
    
    preventOverflow(itemInfo, e);

    itemInfo.toggleClass('active',true);
}
function hideItemInfo(e){
    let itemInfo = $("#itemInfo");
    itemInfo.toggleClass('active',false);
}
function moveItemInfo(e){
    let itemInfo = $("#itemInfo");
    if(itemInfo.hasClass('active')){
        preventOverflow(itemInfo, e)
    }
}

function OnItemContextMenu(e){
    e.preventDefault();
    hideItemInfo();
    let menu = $('#itemContextMenu');
    menu.toggleClass('active',true);
    preventOverflow(menu, e);
    contextMenuTarget = $(this);
    if(contextMenuTarget.data('item').isEquipped===true){
        $('#useBTN').empty().html("Unequip");
    }
    else if(contextMenuTarget.data('item').type==="weapon"||contextMenuTarget.data('item').type==="armour"){
        $('#useBTN').empty().html("Equip");
    }
    else if(contextMenuTarget.data('item').type==="consumable"){
        $('#useBTN').empty().html("Consume");
    }
    else{
        $('#useBTN').empty();
    }
}
function preventOverflow(menu, event){
    //preventing overflow from the page
    let menuWidth = menu.outerWidth();
    let menuHeight = menu.outerHeight();
    let pageWidth = $(window).width();
    let pageHeight = $(window).height();

    let left = event.pageX;
    let top = event.pageY;

    if(left+menuWidth > pageWidth){ //if the menu extends too far to the right
        left = pageWidth-menuWidth;
    }
    if(top+menuHeight > pageHeight){
        top -=menuHeight;
    }
    menu.css({top:`${top}px`,left:`${left}px`});
}
function OnUseBTN(){
    const item = contextMenuTarget.data('item');
    let useBTN = $('#useBTN');
    sendAction(`${useBTN.html()} ${item.itemName}`);
    hideItemInfo();
}