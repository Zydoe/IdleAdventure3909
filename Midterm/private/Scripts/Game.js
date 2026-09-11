/**
 * @author | Ben Judson
 * @Game | class for a game object for a players save game
 */

const { Console } = require('console');
const { ALL } = require('dns');
const fs = require('fs');
const path = require('path');
const roomPath = path.join(__dirname,'..','Game','Maps');
const itemPath = path.join(__dirname,'..','Game',"items.json");
let map = JSON.parse(fs.readFileSync(path.join(roomPath,'Eldi_Map.json'),'utf-8')); //default map  is tutorial map
let ALLITEMS;

class Game{
    constructor(userAccount,SSEResponse){
        this.userAccount = userAccount;
        this.SSEResponse = SSEResponse;
        this.fillALLITEMS();
        if(userAccount.gameKey===null){ //creating a new game
            console.log("creating new Game...");
            this.character = new Character();
            this.currentRoom = new Room(map.find(room => room.roomKey==="ELDI_WOODS_2")); //set the starting room
            this.gameKey = Math.floor(Math.random() * 999999) + 1;
        }
        else{
            console.log("User already has a game");
        }
    }

    fillALLITEMS(){
        ALLITEMS = [];
        let jsonItems = JSON.parse(fs.readFileSync(itemPath));
        for(const categoryName in jsonItems){
            const category = jsonItems[categoryName];
            for (const item of category){
                ALLITEMS.push(new Item(item));
            }
        }
    }
    getPlayerStats(){
        return this.character.stats;
    }
    getCurrentRoom(){
        return this.currentRoom;
    }
    moveNorth(){
        if(this.currentRoom.connections.North===null){
            return false;
        }
        else{
            this.currentRoom = new Room(map.find(room => room.roomKey === this.currentRoom.connections.North.roomKey));
            this.sendRoomDetails();
            return true;
        }
    }
    moveEast(){
        if(this.currentRoom.connections.East===null){
            return false;
        }
        else{
            this.currentRoom = new Room(map.find(room => room.roomKey === this.currentRoom.connections.East.roomKey));
            this.sendRoomDetails();
            return true;
        }
    }
    moveSouth(){
        if(this.currentRoom.connections.South===null){
            return false;
        }
        else{
            this.currentRoom = new Room(map.find(room => room.roomKey === this.currentRoom.connections.South.roomKey));
            this.sendRoomDetails();
            return true;
        }
    }
    moveWest(){
        if(this.currentRoom.connections.West===null){
            return false;
        }
        else{
            this.currentRoom = new Room(map.find(room => room.roomKey === this.currentRoom.connections.West.roomKey));
            this.sendRoomDetails();
            return true;
        }
    }
    saveGame(){
        //Write to txt file or somethng to load later
    }

    //tab data
    sendTabData(tab,res){
        if(tab === "Character"){ //send data for the character tab
            res.send(JSON.stringify(this.character));
        }
        else if(tab === "Items"){
            res.send(JSON.stringify({data:"nodata"})); //placeholder
        }
        else if(tab === "Abilities"){
            res.send(JSON.stringify({data:"nodata"})); //placeholder
        }
        else if(tab === "Quests"){
            res.send(JSON.stringify({data:"nodata"})); //placeholder
        }
        else{
            console.log("User requested a tab that does not exist");
        }
    }

    //actions
    performAction(action){
        action = action.trim().toLowerCase();

        //Commands
        let northCommands = ["n","go north","north","move north"];
        let eastCommands = ["e","go east","east","move east"];
        let southCommands = ["s","go south","south","move south"];
        let westCommands = ["w","go west","west","move west"];

        if(northCommands.includes(action)){
            if(this.moveNorth()){

            }
            else{
                this.SSEResponse.write("event: newMessage\ndata:<p class='gameText'>There is nothing North of you.</p>\n\n");
            }
        }
        else if(eastCommands.includes(action)){
            if(this.moveEast()){

            }
            else{
                this.SSEResponse.write("event: newMessage\ndata:<p class='gameText'>There is nothing East of you.</p>\n\n");
            }
        }
        else if(southCommands.includes(action)){
            if(this.moveSouth()){

            }
            else{
                this.SSEResponse.write("event: newMessage\ndata:<p class='gameText'>There is nothing South of you.</p>\n\n");
            }
        }
        else if(westCommands.includes(action)){
            if(this.moveWest()){

            }
            else{
                this.SSEResponse.write("event: newMessage\ndata:<p class='gameText'>There is nothing West of you.</p>\n\n");
            }
        }
    }

    //update HUD
    updateCharacterInfo(){
        this.SSEResponse.write("event: updateCharacterData\ndata:"+JSON.stringify(this.character)+"\n\n");
    }
    sendRoomDetails(){
        this.SSEResponse.write("event: newMessage\ndata:"+this.getCurrentRoom().toString()+"\n\n");
    }
}

class Character{
    constructor(){
        this.stats = new Stats();
        this.inventory = {};
    }
}
class Stats{
    constructor(){ //set basic character stats
        this.level = 0;
        this.health = 10;
        this.stamina = 11;
        this.strength = 10;
        this.dexterity = 12;
        this.faith = 9;
        this.luck = 10;

        this.maxHealth = this.health;
        this.maxStamina = this.stamina;
    }

    addLevel(num){
        this.level +=num;
    }
    addHealth(num){
        this.health +=num;
    }
    addStrength(num){
        this.strength +=num;
    }
    addDexterity(num){
        this.dexterity +=num;
    }
    addFaith(){
        this.faith +=num;
    }
    addLuck(){
        this.luck +=num;
    }
}

class Item{
    constructor(item){
        console.log("creating new item " + item.itemName)
        this.Copy(item);
    }

    /**
     * @method | Copies another item object
     * @param {the item object to be copied} item 
     */
    Copy(item){
        this.itemKey = item.itemKey;
        this.itemName = item.itemName;
        this.itemDescription = item.itemDescription;
        this.type = item.type;
        if(this.type=="weapon"){
            this.weaponStats = item.weaponStats;
        }
    }
    /**
     * @param {The key for the Item of Inquiry} itemKey 
     * @returns Object item of type item
     */
    static getItemInfo(itemKey){
        return ALLITEMS.find(item=>item.itemKey == itemKey)
    }
}

class Room{
    constructor(room){
        this.Copy(room);
    }

    /**
     * @method | Copy room, copies another room object
     * @param {The room object to copy from} room 
     */
    Copy(room){
        this.roomKey = room.roomKey;
        this.roomName = room.roomName;
        this.roomDescription = room.roomDescription;
        this.connections = room.connections;
        this.npcs = room.npcs;
        this.enemies = room.enemies;
        this.items = room.items;
    }

    toString(){
        let finalMessage = "<p class='gameText'>";
        finalMessage += `<span class='titleMessage'><strong>[${this.roomName}]</strong></span><br><br>`                     //[Room Name]
        finalMessage += this.roomDescription + " ";//Room Description
        if(this.enemies){
            finalMessage += this.enemiesToString();
        }
        if(this.items){
            finalMessage += this.itemsToString();
        }
        if(this.connections){
            finalMessage += this.connectionsToString();
        }
        return finalMessage + "</p>";
    }

    enemiesToString(){
        let finalMessage = "";
        this.enemies.forEach(enemy => {
            finalMessage += enemy.extraDescription + " ";
        });

        return finalMessage;
    }
    itemsToString(){
        let finalMessage = "";
        this.items.forEach(item => {
            finalMessage += item.itemDescription + " ";
        });
        return finalMessage;
    }
    connectionsToString(){
        let finalMessage = "";
        for(const [direction, connection] of Object.entries(this.connections)) {
            if(connection) { //Skip nulls
                finalMessage += `<br><span class="connection"><Strong>${direction}:</strong></span>${connection.entranceDescription}`;
            }
        }
        return finalMessage;
    }
}

module.exports = Game; //export the game to the server