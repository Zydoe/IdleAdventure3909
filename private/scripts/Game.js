/**
 * @author | Ben Judson
 * @Game | class for a game object for a players save game
 */
let ALLITEMS;
let ALLENEMIES;
let ALLMAPS = [];
let ALLGAMES = [];

const connectDatabase = require('./ConnectDatabase');
const EventEmitter = require('events');
let database;

class GameMaster{
    /**
     * @FILLALLITEMS | Fills an array of items that any class can access. The items are of type item and can use Item methods
     */
    static newCharacterQueue = [];
    static async fillALLITEMS(){ //runs on server
        ALLITEMS = [];
        let itemsCursor = await database.collection("Item").find();
        
        //Insert item categories one after another
        let categorys = await itemsCursor.toArray(); //every item category
        for(const category of categorys){
            for(const item of category.items){
                ALLITEMS.push(item);
            }
        }
        itemsCursor.close();
    }

    static async fillALLENEMIES(){ //runs on server
        ALLENEMIES = [];
        let enemyCursor = await database.collection("Enemy").find();
        let enemies = await enemyCursor.toArray();
        for (const enemy of enemies){
            ALLENEMIES.push(new Enemy(enemy));
        }
        enemyCursor.close();
    }

    static async initializeServer(){
        await this.ConnectDatabase();
        await this.fillALLITEMS();
        await this.fillALLENEMIES();
        console.log("Gamemaster is Online");
        return;
    }

    static async getMap(mapName){
        let foundMap = null;
        let emptyMaps = [];
        if(ALLMAPS.length>0){ //if there is at least 1 map loaded
            ALLMAPS.forEach(map => {
                if(map.mapName===mapName){
                    foundMap = map;
                }
                else if(!map.characters){ //if the characters array is empty (Nobody is in the map)
                    emptyMaps.push(map);
                }
            });
            if(!foundMap){ //if no map was found create it
                console.log("Adding Map " + mapName);
                let map = await database.collection("Map").findOne({mapName:mapName});
                let newMap = new Map(map.mapName,map.rooms);
                ALLMAPS.push(newMap);
                return newMap;
            }
            else{ //if map was found return it
                return foundMap;
            }
            
        }
        else{ //if no maps exist, create one
            console.log("Loading first map " + mapName);
            let map = await database.collection("Map").findOne({mapName:mapName});
            let newMap = new Map(map.mapName,map.rooms);
            ALLMAPS.push(newMap);
            return newMap;
        }
    }
    static async AddNewCharacterQueue(username, character){
        GameMaster.newCharacterQueue.push({user:username,character:character})
    }
    static async StartGame(userAccount,SSEResponse){
        let game = this.GetGame(userAccount.username);
        if(!game){
            game = new Game(userAccount, SSEResponse);
            await Game.GameConstructor(game);
            ALLGAMES.push(game);
        }
        else {
            game.SSEResponse = SSEResponse;
        }
        return game;
    }

    static GetGame(username){
        return ALLGAMES.find(game => game.userAccount.username === username);
    }

    static DeleteGame(username){
        ALLGAMES = ALLGAMES.filter(game => game.userAccount.username !== username);
    }

    static async ConnectDatabase(){
        database = await connectDatabase();
        return;
    }
}
class Game{
    constructor(userAccount,SSEResponse){
        this.userAccount = userAccount;
        this.SSEResponse = SSEResponse;
    }

    static async GameConstructor(game){
        if(game.userAccount.gameKey===null){ //creating a new game
            await game.createNewGame(game.userAccount);
        }
        else if(game.userAccount.gameKey){ //Loading an existing game
            await game.loadGame(game.userAccount);
        }
    }


    getPlayerStats(){
        return this.character.stats;
    }
    getCurrentRoom(){
        return this.character.currentRoom;
    }
    async saveGame(){
        let data = {
            character: this.character.toJSON(),
            currentRoomKey: this.getCurrentRoom().roomKey,
            map: this.map.mapName
        }
        await database.collection("Game").updateOne({gameKey:this.gameKey},{$set:data},{upsert:true});
    }
    async loadGame(userAccount){
        const gameKey = userAccount.gameKey;
        console.log("Loading game " + gameKey + "...");
        let usersGame = await database.collection("Game").findOne({gameKey:gameKey});
        if(!usersGame){ //if the game associated with the users game no longer exists
            this.gameKey = null;
            await this.updateUserGameKey();
            console.log("user " + userAccount.username + "'s game no longer exists...");
        }
        this.map = await GameMaster.getMap(usersGame.map);
        this.character = new Character(this,usersGame.character);
        await this.character.setCurrentRoom(usersGame.currentRoomKey);
        this.gameKey = gameKey;
        this.resetInactivityTimer();
    }
    async createNewGame(userAccount){
        console.log("Creating new game...");
        let foundCharacter = false;
        for(let i =0; i<GameMaster.newCharacterQueue.length;i++){
            if(GameMaster.newCharacterQueue[i].user === userAccount.username){
                foundCharacter = true;
                this.character = new Character(this,GameMaster.newCharacterQueue[i].character);
            }
        }
        if(!foundCharacter){
            console.warn(`User ${userAccount.username} could not find new Character submition..`)
            return;
        }
        this.character.map = "Eldi";
        this.map = await GameMaster.getMap(this.character.map);
        await this.character.setCurrentRoom("ELDI_WOODS_2"); //set the starting room
        this.gameKey = Math.floor(Math.random() * 999999) + 1;
        userAccount.gameKey = this.gameKey;
        await this.updateUserGameKey();
        console.log("Created new game " + this.gameKey + " successfully!");
        this.saveGame();
        this.resetInactivityTimer();
    }

    //tab data
    sendTabData(tab,res){
        if(tab === "Character"){ //send data for the character tab
            res.send(JSON.stringify(this.character));
        }
        else if(tab === "Items"){
            let genericInventory = this.character.inventory.toJSON();
            let newItems = [];
            for(let i=0;i<genericInventory.items.length;i++){ //making the items in the JSON full items
                if(genericInventory.items[i]){
                    newItems.push(Item.getItem(genericInventory.items[i]).toJSON());
                }
                else{
                    newItems.push(null);
                }
            }
            for(const itemKey in genericInventory.equipped){
            if(genericInventory.equipped[itemKey]){
                genericInventory.equipped[itemKey] = Item.getItem(genericInventory.equipped[itemKey]);
            }
            else{
                genericInventory.equipped[itemKey] = null;
            }
        }
            genericInventory.items = newItems;
            res.send(JSON.stringify(genericInventory)); //placeholder
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
    async performAction(action){
        if(action.length>60){
            this.sendGameMessage(`<p class='gameText warning'>-Command is too long...</p>`);
            return;
        }
        this.sendGameMessage(`<p class='gameText userText'>"${action}"</p>`);

        let validAction = false;
        //Commands
        const socialCommands = {
            speech:["say","talk","tell","shout","yell","whisper"]
        }
        const directionCommands = {
            North:["n","go north","north","move north"],
            East:["e","go east","east","move east"],
            South:["s","go south","south","move south"],
            West:["w","go west","west","move west"]
        }
        const lookCommands=["l","look","look around","where am i"];
        const lootingCommands = {
            TakeItem:["take","pickup","pick up","grab","collect"],
            LootContainer:["loot","open","search"]
        }
        const consumeableCommands=["eat","drink","consume","devour","nom nom"];
        const equipCommands = ["equip","wear","hold","put on"];
        const unEquipCommands = ["unequip","take off","remove"];
        const combatCommands = ["attack","kill","flee"];

        if(!validAction){//speech
            for(let command of socialCommands.speech){
                if(action.toLowerCase().startsWith(command)){
                    validAction = true;
                    let userSpeech = action.slice(command.length).trim().slice();
                    this.getCurrentRoom().Broadcast(`<p class='gameText playerSpeech'><span class='player'>[${this.character.characterName}]</span> ${userSpeech}</p>`);
                }
            }
        }

        action = action.trim().toLowerCase(); //standardize the user input
        //Checking actions
        if(!validAction){ //Direction commands
            for(const [direction, command] of Object.entries(directionCommands)){ //Direction Commands
                if(command.includes(action)){ //if the user is trying to move
                    validAction = true;
                    if(this.character.move(direction)===true){ //try to move the character that way
                        break;
                    }
                    else if(typeof this.character.move(direction) === "string"){ //if the move function returns a string, it is an error message to show the user
                        this.sendGameMessage(`<p class='gameText warning'>${this.character.move(direction)}</p>`);
                    }
                    else{ //if there is no room that direction
                        this.sendGameMessage(`<p class='gameText warning'>There is nothing ${direction} of you.</p>`);
                        break;
                    }
                }
            }
        }
        if(!validAction){ //Looking commands
            if(lookCommands.includes(action)){ //looking commands
            validAction = true;
            this.sendRoomDetails();
        }
        }
        if(!validAction){ //Consumable commands
            for(let command of consumeableCommands){
                if(action.includes(command)){
                    validAction = true;
                    let requestedItem = action.replace(command,"").trim().toLowerCase();
                    let characterInventory = this.character.inventory;
                    let consumed = false;
                    for(let item of characterInventory.items){
                        if(item){ //existance check
                            if(item.itemName.toLowerCase().includes(requestedItem)){ //find item
                                if(item.type==="consumable"){ //check if its a consumable (eat Iron sword was an interesting behaviour lol)
                                    this.sendGameMessage(`<p class='gameText'>-----<strong>You consumed your ${item.itemName}!</strong>-----</p>`);
                                    this.character.Consume(item.itemKey);
                                    consumed = true;
                                    break;
                                }
                                else{
                                    this.sendGameMessage(`<p class='gameText warning'>-----You cannot consume ${item.itemName}-----</p>`);
                                    consumed = true;
                                }
                            }
                        }
                    }
                    if(!consumed){
                        this.sendGameMessage(`<p class='gameText warning'>-----You dont have an item called '${requestedItem}' in your inventory...-----</p>`)
                    }
                    break;
                }
            }
        }
        if(!validAction){ //Unequip commands
            for(let i=0;i<unEquipCommands.length;i++){ //Unequip command
                if(action.startsWith(unEquipCommands[i]+ " ")){
                    validAction = true;
                    let requestedItem = action.replace(unEquipCommands[i],"").trim().toLowerCase();
                    let characterInventory = this.character.inventory;
                    for(const slot of Object.keys(characterInventory.equipped)){ //for all the keys of equipped
                        if(requestedItem===slot.toLowerCase()){ //if they typed "head" or similar unequips the head slot
                            this.sendGameMessage(`<p class='gameText'>-----<strong>You Unequipped your ${characterInventory.equipped[slot].itemName}</strong>-----</p>`);
                            this.character.unequip(slot);
                            break;
                        }
                        if(characterInventory.equipped[slot]){
                            if(characterInventory.equipped[slot].itemName.toLowerCase().includes(requestedItem)){ //if they unequipped helmet, unequip head slot
                                this.sendGameMessage(`<p class='gameText'>-----<strong>You Unequipped your ${characterInventory.equipped[slot].itemName}</strong>-----</p>`);
                                this.character.unequip(slot);
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }
        if(!validAction){ //Equip commands
            for(let i=0;i<equipCommands.length;i++){ //Equip command
                if(action.startsWith(equipCommands[i]+" ")){
                    validAction = true;
                    let requestedItem = action.replace(equipCommands[i],"").trim();
                    let characterInventory = this.character.inventory.items;
                    let itemEquipped = false;
                    for(let j=0;j<characterInventory.length;j++){
                        if(characterInventory[j]){ //if the space in the inventory is full
                            if(characterInventory[j].itemName.toLowerCase().includes(requestedItem)){ //compare item names
                                itemEquipped = true;
                                this.sendGameMessage(`<p class='gameText'>-----<strong>You Equipped your ${characterInventory[j].itemName}</strong>-----</p>`);
                                this.character.equip(characterInventory[j]);
                                break;
                            }
                        }
                    }
                    if(!itemEquipped){
                    this.sendGameMessage(`<p class='gameText warning'>There is no item called ${requestedItem} in your inventory.</p>`); 
                    }
                    break;
                }
            }
        }
        
        if(!validAction){ //Looting commands
            for(const [lootType,commands] of Object.entries(lootingCommands)){ //Looting items commands
                for(const command of commands){
                    if(action.includes(command)){
                        validAction = true;
                        if(!this.character.inventory.isFull()){ //if the inventory has space for an item
                            if(lootType==="TakeItem"){ //taking an item from a room
                                let requestedItem = action.slice(command.length).trim();
                                if(!this.getCurrentRoom().items || this.getCurrentRoom().items.length===0){ //if there are no items in the room
                                    this.sendGameMessage(`<p class='gameText warning'>-----There is nothing to take here...-----</p>`);
                                    break;
                                }
                                if(this.getCurrentRoom().items.length===1 && !requestedItem){ //take works if only 1 item to take without needing to specify the item name
                                    requestedItem = Item.getItem(this.getCurrentRoom().items[0].itemKey).itemName;
                                }
                                else if(!requestedItem){ //ensure the player specifies an item
                                    this.sendGameMessage(`<p class='gameText warning'>-----Please specify an item to take...-----</p>`);
                                    break;
                                }
                                let pickedUpItem = false;
                                if(this.getCurrentRoom().items){
                                    for(let i=0;i<this.getCurrentRoom().items.length;i++){
                                        let currentRoom = this.getCurrentRoom();
                                        if(Item.getItem(currentRoom.items[i].itemKey).itemName.toLowerCase().includes(requestedItem)){
                                            let item = this.character.addItem(currentRoom.removeItem(currentRoom.items[i].itemKey).itemKey);
                                            pickedUpItem = true;
                                            this.sendGameMessage(`<p class='gameText'>-----<strong>You picked up ${item.itemName}!</strong>-----</p>`)
                                            this.updateInventoryInfo();
                                            break;
                                        }
                                    }
                                }
                                if(!pickedUpItem){
                                    this.sendGameMessage(`<p class='gameText warning'>-----There is no item called ${requestedItem} in the area...-----</p>`);
                                }
                            }
                        }
                        else{
                            this.sendGameMessage(`<p class='gameText warning'>-----Your hands are full, you cannot pick anything else up!-----</p>`)
                        }
                    }
                }
            }
        }

        if(!validAction){ //combat action
            for(let i=0;i<combatCommands.length;i++){
                if(action.includes(combatCommands[i])){
                    validAction = true;
                    if(this.getCurrentRoom().combatEncounter){
                        this.getCurrentRoom().combatEncounter.PerformCombatAction(action,this.character);
                        break;
                    }
                    else{
                        this.sendGameMessage(`<p class='gameText warning'>You are not in combat...</p>`)
                        break;
                    }
                }
            }
        }
        if(!validAction){ //if it couldn't find the action
            this.sendGameMessage(`<p class='gameText warning'>-----Did Not Recognise ${action} As A Valid Action-----</p>`);
        }
        this.saveGame();
        this.updateUserActions();//leave at bottom, occurs after a user has done an action
        this.resetInactivityTimer();
    }

    //update HUD
    updateCharacterInfo(){
        this.SSEResponse.write("event: updateCharacterData\ndata:"+JSON.stringify(this.character)+"\n\n");
    }
    updateInventoryInfo(){
        let genericInventory = this.character.inventory.toJSON();
        let newItems = [];
        for(let i=0;i<genericInventory.items.length;i++){ //making the items in the JSON full items for client
            if(genericInventory.items[i]){
                newItems.push(Item.getItem(genericInventory.items[i]).toJSON());
            }
            else{
                newItems.push(null);
            }
        }
        for(const itemKey in genericInventory.equipped){
            if(genericInventory.equipped[itemKey]){
                genericInventory.equipped[itemKey] = Item.getItem(genericInventory.equipped[itemKey]);
            }
            else{
                genericInventory.equipped[itemKey] = null;
            }
        }
        genericInventory.items = newItems;
        this.SSEResponse.write("event: updateInventoryData\ndata:"+JSON.stringify(genericInventory)+"\n\n");
    }
    updateUserActions(){
        this.SSEResponse.write("event: updateActions\ndata:"+JSON.stringify(this.getPossibleActions())+"\n\n")
    }
    sendRoomDetails(){
        this.SSEResponse.write("event: newMessage\ndata:"+this.getCurrentRoom().toString(this.character)+"\n\n");
    }
    /**
     * @purpose | Print HTML to the game text area
     * @param {The HMTL message to print} message 
     */
    sendGameMessage(message){
        this.SSEResponse.write("event: newMessage\ndata:"+message+"\n\n");
    }
    async updateUserGameKey(){
        let users = await database.collection('User');
        await users.updateOne({username:this.userAccount.username},{$set:{gameKey:this.gameKey}})
    }
    getPossibleActions(){
        let possibleActions = {};
        possibleActions.directions = [];
        possibleActions.passive = [];
        possibleActions.items=[];
        possibleActions.combat = [];
        possibleActions.social = [];
        let currentRoom = this.getCurrentRoom(); //<-----------LOCAL VARIABLE "currentRoom" !!! !!!! !!!!!!!!!! (if i forget to remove this comment this exists to stop me from using getCurrentRoom everytime I add an action)
        possibleActions.passive.push("Look Around"); //Look
        if(currentRoom.connections.North){ //Directions
            possibleActions.directions.push("Go North");
        }
        if(currentRoom.connections.East){
            possibleActions.directions.push("Go East");
        }
        if(currentRoom.connections.South){
            possibleActions.directions.push("Go South");
        }
        if(currentRoom.connections.West){
            possibleActions.directions.push("Go West");
        }
        if(currentRoom.items&&currentRoom.items.length>0){ //Collectable Items
            for(let i=0;i<currentRoom.items.length;i++){
                possibleActions.items.push(`Take ${Item.getItem(currentRoom.items[i].itemKey).itemName}`)
            }
        }
        if(this.character.inventory.items.length>0){
            for(let item of this.character.inventory.items){ //adding equip action
                if(item){
                    if(item.type === "weapon" || item.type === "armour"){
                        possibleActions.items.push(`Equip [Item]`);
                        break;
                    }
                }
            }
            for(let item of this.character.inventory.items){ //adding consume action
                if(item){
                    if(item.type==="consumable"){
                        possibleActions.items.push(`Consume [Item]`);
                        break;
                    }
                }
            }
            
        }
        if(currentRoom.players.length>1){ //Social
            possibleActions.social.push("Say Hi! I'm " + this.character.characterName)
        }

        if(currentRoom.combatEncounter){
            for(let enemy of currentRoom.enemies){
                possibleActions.combat.push(`Attack ${enemy.enemyName}`);
            }
        }
        
        return possibleActions;
    }

    resetInactivityTimer(){
        this.inactivityTimer = null;
        this.inactivityTimer = setTimeout(()=>{
            this.sendGameMessage(`<p class='gameText warning'>You have been disconnected due to inactivity...</p>`);
            this.leaveGame("You have been disconnected due to inactivity...");
        },1000*60*15); //15 minute timer
    }

    leaveGame(message){
        this.saveGame();
        this.getCurrentRoom().removePlayer(this.character);
        this.SSEResponse.write(`event: disconnect\ndata: ${message}\n\n`);
        this.SSEResponse.end();
        GameMaster.DeleteGame(this.userAccount.username);
    }
}

class Character{
    constructor(game,character){
        this.game = game;
        if(!character){
            this.characterName = "John Doe";
            this.stats = new Stats();
            this.inventory = new Inventory();
        }
        else{
            this.Clone(character);
            if(!this.stats.level){
                this.stats.level = 0;
            }
            if(!this.stats.health){
                this.stats.health = 10;
                this.stats.maxHealth = this.stats.health;
            }
            if(!this.stats.stamina){
                this.stats.stamina = 10;
                this.stats.maxStamina = this.stats.stamina;
            }
        }
        this.stats.on('death', () => {this.OnDeath()});
    }

    toJSON(){
        return {
            characterName: this.characterName,
            stats:this.stats.toJSON(),
            inventory:this.inventory.toJSON(),
            class: this.class,
            sex: this.sex
        }
    }

    Clone(character){
        this.characterName = character.characterName;
        this.stats = new Stats(character.stats);
        this.class = character.class;
        this.sex = character.sex;
        if(character.inventory){
            this.inventory = new Inventory(character.inventory);
        }
        else{
            this.inventory = new Inventory();
        }
        
    }

    async setCurrentRoom(roomKey){
        let map = await GameMaster.getMap(this.game.map.mapName);
        let newRoom = this.currentRoom = map.getRoom(roomKey);
        if(this.currentRoom){
            this.currentRoom.removePlayer(this);
        }
        this.currentRoom = newRoom;
        newRoom.addPlayer(this);
        return newRoom;
    }

    OnDeath(){
        //Death messages
        this.currentRoom.BroadcastExclude(`<p class='gameText'>----${this.characterName} falls to the ground, dead.----`,this);
        this.sendGameMessage(`<p class='gameText warning'>----<strong>You Died in ${this.currentRoom.roomName}</strong>----`);

        //Remove player from the world
        this.currentRoom.players = this.currentRoom.players.filter(p => p !== this);
        
        if(this.currentRoom.combatEncounter){
            this.currentRoom.combatEncounter.RemovePlayer(this);
        }
        this.currentRoom.UpdatePlayerActions();


        this.Respawn();
    }

    Respawn(){
        //reset health and stamina
        this.stats.health = this.stats.maxHealth;
        this.stats.stamina = this.stats.maxStamina;

        let respawnRoom = this.game.map.getRoom('ELDI_WOODS_2');
        this.setCurrentRoom(respawnRoom.roomKey);
        this.sendGameMessage(`<p class='gameText'>----You are respawning in the <strong>${respawnRoom.roomName}</strong>----`);
        this.game.updateCharacterInfo();
    }

    move(direction){ //return true if the move was successful, return problem message if not
        //this.equip(this.inventory.items[0]);
        const dir = direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase(); //corrected syntax direction Capitol start letter
        const connection = this.currentRoom.connections[dir];
        if(!connection){
            return `There is nothing ${direction} of you.`;
        }
        else{
            if(this.currentRoom.combatEncounter){
                this.game.sendGameMessage(`<p class='gameText'>----------<strong>You flee to the ${direction}!</strong>----------</p>`)
            }
            else if(!this.game.map.getRoom(connection.roomKey)){
                return `The way ${direction} of you is obstructed.`;
            }
            else{
                this.game.sendGameMessage(`<p class='gameText'>----------<strong>You go ${direction}!</strong>----------</p>`)
            }
            this.enterRoom(connection.roomKey);
            return true;
        }
        
    }
    enterRoom(roomKey){
        this.currentRoom.removePlayer(this);
        this.currentRoom = this.game.map.getRoom(roomKey);
        this.currentRoom.addPlayer(this);
    }
    addItem(itemKey){
        let item = this.inventory.addItem(itemKey);
        this.game.updateInventoryInfo();
        return item;
    }
    removeItem(itemKey){
        let item = this.inventory.removeItem(itemKey);
        this.game.updateInventoryInfo();
        return item;
    }
    equip(item){
        this.inventory.equip(item);
        this.game.updateInventoryInfo();
    }
    unequip(slot){
        this.inventory.unequip(slot);
        this.game.updateInventoryInfo();
        this.game.updateCharacterInfo();
    }
    Consume(itemKey){
        let item = Item.getItem(itemKey);
        if(item.type!=="consumable"){
            throw "Tried to consume a " + item.type;
        }
        else{
            let effectsMessage = `-<strong>Effects</strong>-`;
            for(let attribute in item.stats){
                if(this.stats.hasOwnProperty(attribute)){// if player has the stat the item provides
                    if(attribute==="health"){
                        this.stats.addHealth(item.stats[attribute]);
                    }
                    else if(attribute==="stamina"){
                        this.stats.addStamina(item.stats[attribute]);
                    }
                    else{
                        this.stats[attribute] += item.stats[attribute]; 
                    }
                    
                }
                else{
                    this.stats[attribute] = item.stats[attribute]; // If player doesnt have the attribute provided by the item, they will gain it (upsert)
                }
                effectsMessage+=`<br>${attribute.charAt(0).toUpperCase()+attribute.slice(1)}: ${item.stats[attribute]>0 ? "+" : "-"}${item.stats[attribute]}`
            } 
            this.game.sendGameMessage(`<p class='gameText'>${effectsMessage}</p>`);
        }
        
        this.removeItem(itemKey);
    }

    get defence(){
        let head = this.inventory.equipped.head ? this.inventory.equipped.head.armourStats.armour: 0;
        let chest = this.inventory.equipped.chest ? this.inventory.equipped.chest.armourStats.armour: 0;
        let legs = this.inventory.equipped.legs ? this.inventory.equipped.legs.armourStats.armour: 0;
        let feet = this.inventory.equipped.feet ? this.inventory.equipped.feet.armourStats.armour: 0;

        let Defence = head + chest + legs + feet;
        return Defence;
    }
    get offence(){
        let Offence = 0;
        if(this.inventory.equipped.mainHand){
            if(this.inventory.equipped.mainHand.type==="weapon"){
                Offence+=this.inventory.equipped.mainHand.weaponStats.damage;
            }
        }
        return Offence;
    }

    sendGameMessage(message){
        this.game.sendGameMessage(message);
    }
}
class Stats extends EventEmitter{
    constructor(stats){ //set basic stats
        super();
        if(!stats){
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
        else{
            Object.assign(this,JSON.parse(JSON.stringify(stats)));
        }
    }

    addLevel(num){
        this.level +=num;
    }
    addHealth(num){
        this.health+=num; //adding health
        if(this.health<=0){ //on entity death
            this.health = 0;
            this.emit('death');
        }
        if(this.maxHealth){
            if(this.health>this.maxHealth){ //going over max health
                this.health = this.maxHealth;
            }
        }
    }
    addStamina(num){
        if(num+this.stamina>this.maxStamina){
            this.stamina = this.maxStamina;
        }
        else{
            this.stamina +=num;
        }
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
    Override(stats){
        Object.assign(this,JSON.parse(JSON.stringify(stats)));
    }

    toJSON(){
        return{
            level: this.level,
            health: this.health,
            maxHealth: this.maxHealth,
            stamina: this.stamina,
            maxStamina: this.maxStamina,
            strength: this.strength,
            dexterity: this.dexterity,
            faith: this.faith,
            luck: this.luck
        }
    }
    Clone(stats){
        this.level = stats.level;
        this.health = stats.health;
        this.stamina = stats.stamina;
        this.strength = stats.strength;
        this.dexterity = stats.dexterity;
        this.faith = stats.faith;
        this.luck = stats.luck;

        this.maxHealth = stats.maxHealth;
        this.maxStamina = stats.maxStamina;
    }
}

class Item{
    constructor(item){
        Object.assign(this,item);
    }

    /**
     * @param {The key for the Item of Inquiry} itemKey 
     * @returns Creates Object item of type item
     */
    static getItem(itemKey){
        const found = ALLITEMS.find(item => item.itemKey === itemKey);
        return found ? new Item(found) : null;
    }

    toJSON(){
        let genericObject = {
            itemKey: this.itemKey,
            itemName: this.itemName,
            itemDescription: this.itemDescription,
            type: this.type
        }
        if(this.type === "weapon"){
            genericObject.weaponStats = this.weaponStats;
        }
        if(this.type === "armour"){
            genericObject.armourStats = this.armourStats;
        }
        if(this.type === "consumable"){
            genericObject.stats = this.stats;
        }
        return genericObject;
    }
}
class Map{
    constructor(mapName,rooms){
        this.mapName = mapName;
        this.characters = [];
        this.roomDefinitions = [];
        this.rooms = []; //empty map
        this.fillMap(rooms)
    }

    fillMap(rooms){
        for(let i=0;i<rooms.length;i++){ //for every room define it
            let newRoomDefinition = {
                roomKey: rooms[i].roomKey,
                roomName: rooms[i].roomName,
                mapName: this.mapName,
                roomDescription: rooms[i].roomDescription,
                connections: {
                    North: rooms[i].connections.North ? {roomKey: rooms[i].connections.North.roomKey, entranceDescription: rooms[i].connections.North.entranceDescription} : null,
                    South: rooms[i].connections.South ? {roomKey: rooms[i].connections.South.roomKey, entranceDescription: rooms[i].connections.South.entranceDescription} : null,
                    East: rooms[i].connections.East ? {roomKey: rooms[i].connections.East.roomKey, entranceDescription: rooms[i].connections.East.entranceDescription} : null,
                    West: rooms[i].connections.West ? {roomKey: rooms[i].connections.West.roomKey, entranceDescription: rooms[i].connections.West.entranceDescription} : null
                },
                npcs: rooms[i].npcs
            }
            if(rooms[i].enemies){ //enemy definitions
                newRoomDefinition.enemies = [];
                for(let j=0;j<rooms[i].enemies.length;j++){
                    newRoomDefinition.enemies.push({
                        enemyKey: rooms[i].enemies[j].enemyKey,
                        enemyName: rooms[i].enemies[j].enemyName,
                        extraDescription: rooms[i].enemies[j].extraDescription,
                        enemyDeathDescription: rooms[i].enemies[j].enemyDeathDescription,
                        overrideStats: rooms[i].enemies[j].overrideStats,
                        inventory: rooms[i].enemies[j].inventory ? {
                            items: rooms[i].enemies[j].inventory.items ? [rooms[i].enemies[j].inventory.items] : null,
                            enemyMainHand: rooms[i].enemies[j].inventory.enemyMainHand ? rooms[i].enemies[j].inventory.enemyMainHand : null
                        } : null
                    })
                }
            }
            if(rooms[i].items){ //item definitions
                newRoomDefinition.items = [];
                for(let j=0;j<rooms[i].items.length;j++){
                    newRoomDefinition.items.push({
                        itemKey: rooms[i].items[j].itemKey,
                        itemDescription: rooms[i].items[j].itemDescription
                    })
                }
            }
            let def = new RoomDefinition(newRoomDefinition);
            this.roomDefinitions.push(def);
            this.rooms.push(new Room(def));
        }
    }

    getRoomDefinition(roomKey){
        let foundRoom = null;
        this.roomDefinitions.forEach((room)=>{
            if(room.roomKey === roomKey){
                foundRoom = room;
            }
        })
        return foundRoom;
    }

    getRoom(roomKey){
        let foundRoom = null;
        this.rooms.forEach((room)=>{
            if(room.roomKey === roomKey){
                foundRoom = room;
            }
        })
        return foundRoom;
    }


    //getPlayerCount function
}

class RoomDefinition{
    constructor(room){
        this.roomKey = room.roomKey;
        this.roomName = room.roomName;
        this.roomDescription = room.roomDescription;
        this.connections = room.connections;
        this.npcs = room.npcs;
        this.enemies = room.enemies;
        this.items = room.items;
        this.mapName = room.mapName;
    }
}

class Room{
    constructor(room){
        this.def = room;
        this.players=[];
        this.resetTimer=null;
        this.Reset(room);
    }

    /**
     * @method | Copy room, copies another room object
     * @param {The room object to copy from} room 
     */
    Reset(){
        this.roomKey = this.def.roomKey;
        this.roomName = this.def.roomName;
        this.roomDescription = this.def.roomDescription;

        this.connections = this.def.connections;

        if(this.def.items) {this.items = this.def.items.map(i => ({ ...i }));}
        else{this.items = [];}

        if(this.def.enemies){
            this.enemies = this.def.enemies.map(e => {
                const enemy = Enemy.SpawnEnemy(e.enemyKey, e);
                enemy.stats.on('death', () => this.OnEnemyDeath(enemy));
                return enemy;
            });
        }
        else{
            this.enemies = [];
        }
        

        //this.npcs = this.def.npcs.map(n => NPC.Spawn(n.key, n));
    }
    OnEnemyDeath(enemy){
        if(enemy.enemyDeathDescription){
            this.Broadcast(`<p class='gameText'>----${enemy.enemyDeathDescription}----</p>`);
        }
        else{
            this.Broadcast(`<p class='gameText'>----${enemy.enemyName} grunts a final breath, then hunches over, dead!----</p>`); //defaults a death description
        }
        this.removeEnemy(enemy);
    }
    addPlayer(player){
        this.players.push(player);
        this.UpdatePlayerActions();
        player.game.sendRoomDetails();
        if(!this.combatEncounter){ //if no encouter exists
            if(this.enemies.length>0){ //if there are enemies in the room
                this.BroadcastExclude(`<p class='gameText'>----${player.characterName} begins a fight!----</p>`,player);
                player.sendGameMessage(`<p class='gameText'>----You begin a fight!----</p>`)
                this.combatEncounter = new CombatEncounter(this);
            }
            else{
                this.BroadcastExclude(`<p class='gameText'>----${player.characterName} enters the ${this.roomName}----</p>`,player);
            }
        }
        else{
            if(this.enemies.length>0){
                this.BroadcastExclude(`<p class='gameText'>----${player.characterName} bursts into the ${this.roomName}----</p>`,player);
                this.combatEncounter.AddPlayer(player) //adds player to the fight
            }
        }
        if(this.resetTimer){ //reset room timeout if a player enters while its counting down
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }
    removePlayer(player){
        if(this.players.some(p => p === player)){
            this.players = this.players.filter(p => p !== player);
            if(this.combatEncounter){
                this.BroadcastExclude(`<p class='gameText'>----${player.characterName} flees the ${this.roomName}----</p>`,player);
                this.combatEncounter.RemovePlayer(player);
            }
            else{
                this.BroadcastExclude(`<p class='gameText'>----${player.characterName} leaves the ${this.roomName}----</p>`,player);
            }
            this.UpdatePlayerActions();
        }
        if(this.players.length===0){
            
            this.startResetTimer();
        }
    }
    startResetTimer(){
        // If a timer already exists, do nothing
        if(this.resetTimer) return;

        this.resetTimer = setTimeout(() => {
            // Only reset if still empty
            if(this.players.length === 0){
                this.Reset();
            }
            this.resetTimer = null; // clear handle
        }, 3  * 60*  1000); // 3 minutes
    }

    removeEnemy(enemy){
        if(this.combatEncounter) this.combatEncounter.removeEnemy(enemy);
        this.enemies = this.enemies.filter(e => e !== enemy);
    }
    UpdatePlayerActions(){
        for(let player of this.players){
            player.game.updateUserActions();
        }
    }
    toJSON(){
        return {
            roomKey: this.roomKey,
            roomName: this.roomName,
            roomDescription: this.roomDescription,
            connections: this.connections,
            npcs: this.npcs,
            enemies: this.enemies,
            items: this.items
        }
    }
    Broadcast(message){
        for(let player of this.players){
            player.sendGameMessage(message);
        }
    }
    /**
     * 
     * @param {The message to be Broadcast} String
     * @param {The player to be excluded from the broadcast} Player 
     */
    BroadcastExclude(message, Eplayer){
        for(let player of this.players){
            if(player===Eplayer){
                continue;
            }
            player.sendGameMessage(message);
        }
    }
    toString(player){
        let finalMessage = "<p class='gameText'>";
        finalMessage += `<span class='titleMessage'><strong>[${this.roomName}]</strong></span><br><br>`                     //[Room Name]
        finalMessage += this.roomDescription + " ";//Room Description
        if(this.enemies){
            finalMessage += this.enemiesToString();
        }
        if(this.items){
            finalMessage += this.itemsToString();
        }
        if(this.players.length>1){
            finalMessage += this.playersToString(player);
        }
        if(this.connections){
            finalMessage += this.connectionsToString();
        }
        if(this.enemies){
            finalMessage += this.battleToString();
        }
        return finalMessage + "</p>";
    }
    enemiesToString(){
        let finalMessage = "";
        this.enemies.forEach(enemy => {
            finalMessage += enemy.description + " ";
        });

        return finalMessage;
    }
    playersToString(currentPlayer){
        let finalMessage = " ";
        let shownPlayers = 5;
        if(this.players.length<=shownPlayers){ //if there are only a few players in the area, list them all
            for(let player of this.players){
                if(player===currentPlayer){
                    continue;
                }
                if(player.sex === 'male'){
                    finalMessage += ` A man called<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
                else if(player.sex==='female'){
                    finalMessage += ` A woman named<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
                else{
                    finalMessage += ` A person known as<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
            }
        }
        else{ //many players in the area, just give a number and names of some of them to avoid spamming the player with messages
            for(let i=0;i<shownPlayers;i++){
                let player = this.players[i];
                if(player===currentPlayer){
                    continue;
                }
                if(player.sex === 'male'){
                    finalMessage += ` A man called<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
                else if(player.sex==='female'){
                    finalMessage += ` A woman named<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
                else{
                    finalMessage += ` A person known as<span class='player'><strong> ${player.characterName}</strong></span> is nearby. `;
                }
            }
            finalMessage += `There are ${this.players.length-shownPlayers-1} other people in the area. `;
        }
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
    battleToString(){
        let finalMessage = "";
        if(this.enemies){
            for(let i=0;i<this.enemies.length;i++){
                finalMessage += `<br><span class='enemy battleText'><strong>${this.enemies[i].enemyName}</strong></span>`
                finalMessage += `<br><span class='gameText'><strong>Level: ${this.enemies[i].stats.level}</strong></span>`
                finalMessage += `<br><span class='gameText'><strong>Health: ${this.enemies[i].stats.health}</strong></span>`
            }
            if(this.combatEncounter){
                for(let player of this.combatEncounter.players){
                    finalMessage += `<br><span class='player battleText'><strong>${player.characterName}</strong></span>`
                    finalMessage += `<br><span class='gameText'><strong>Level: ${player.stats.level}</strong></span>`
                    finalMessage += `<br><span class='gameText'><strong>Health: ${player.stats.health}</strong></span>`
                }
            }
        }
        return finalMessage;
    }
    removeItem(itemKey){
        const index = this.items.findIndex(item => item.itemKey === itemKey);
        if (index !== -1) {
            const removed = this.items.splice(index, 1)[0];
            return removed;
        }
        return null;
    }
    resetRoom(){
        this.Reset(def);
    }
}
class Enemy{
    constructor(enemy){
        this.Clone(enemy);
    }

    Clone(enemy){
        this.enemyKey = enemy.enemyKey;
        this.enemyName = enemy.enemyName;
        this.stats = new Stats(enemy.stats);
        this.inventory = new Inventory(enemy.inventory);
        this.enemyDeathDescription = enemy.enemyDeathDescription;
    }

    static SpawnEnemy(enemyKey,enemyAlterations){
        let newEnemy = new Enemy(ALLENEMIES.find(enemy => enemy.enemyKey === enemyKey))
        newEnemy.stats = new Stats(newEnemy.stats); //reset stats object
        
        if(enemyAlterations){
            if(enemyAlterations.enemyName){
                newEnemy.enemyName = enemyAlterations.enemyName;
            }
            if(enemyAlterations.overrideStats){
                newEnemy.stats.Override(enemyAlterations.overrideStats);
            }
            if(enemyAlterations.extraDescription){
                newEnemy.description = enemyAlterations.extraDescription;
            }
            if(enemyAlterations.inventory){
                newEnemy.inventory = new Inventory(enemyAlterations.inventory);
            }
            if(enemyAlterations.enemyDeathDescription){
                newEnemy.enemyDeathDescription = enemyAlterations.enemyDeathDescription;
            }
        }
        return newEnemy;
    }
    ToHtml(){
        let finalMessage="";
        finalMessage += `<br><span class='enemy'><strong>${this.enemyName}</strong></span>`
        finalMessage += `<br><span class='gameText'>Level: ${this.stats.level}</span>`
        finalMessage += `<br><span class='gameText'>Health: ${this.stats.health}</span>`
        return finalMessage;
    }

    get offence(){
        let Offence = 0;
        Offence += Item.getItem(this.inventory.enemyMainHand).weaponStats.damage;
        return Offence;
    }
    get defence(){
        if(this.stats.defence===undefined){
            return this.stats.defence = 0;
        }
        return this.stats.defence;
    }
    OnDeath(){
        
    }
}
class Inventory{
    /**
     * CLASS Inventory
     * Contains a list of items, an item called "mainHand", and an object called Armour
     * Add and remove Items with addItem(KEY) and removeItem(KEY)
     */
    constructor(inventory){
        this.maxInventorySlots = 35;
        if(!inventory){//if there is no inventory
            this.items = [];
            for(let i=0;i<this.maxInventorySlots;i++){
                this.items[i]=null;
            }
            this.equipped = new Equipped();
            this.currency = 0;
        }
        else{
            this.Clone(inventory);
        }
        
    }
    Clone(inventory){
        this.items = [];
        for(let i=0;i<inventory.items.length;i++){
            if(inventory.items[i]&&inventory.items[i].lootingDescription){ //if enemy inventory items
                if(inventory.items[i]){
                    this.items.push(Item.getItem(inventory.items[i].itemKey));
                    this.items[i].itemDescription = inventory.items[i].lootingDescription;
                }
                else{
                    this.items.push(null);
                }
            }
            else{
                if(inventory.items[i]){
                    this.items.push(Item.getItem(inventory.items[i]));
                }
                else{
                    this.items.push(null);
                }
            }
        }
        if(inventory.enemyMainHand){
            this.enemyMainHand = inventory.enemyMainHand;
        }
        this.currency = inventory.currency;
        this.equipped = new Equipped(inventory.equipped);
    }
    toJSON(){
        let genericObject= {
            items: [],
            equipped: this.equipped.toJSON(),
            currency: this.currency,
            maxInventorySlots:this.maxInventorySlots
        }
        if(this.items){
            for(let i=0;i<this.items.length;i++){
                if(this.items[i]){
                    genericObject.items.push(this.items[i].itemKey)
                }
                else{
                    genericObject.items.push(null)
                }
                
            }
        }
        
        return genericObject;
    }
    addItem(itemKey){
        let newItem = Item.getItem(itemKey);
        let itemAddedSuccessfuly = false;
        if(!newItem){ //if the itemKey did not find anything
            console.log("Could not add item to inventory: item: " + itemKey);
            return false;
        }
        if(newItem.itemType==="currency"){ //if the player is picking up money
            this.currency += newItem.value; //add to their currency
            itemAddedSuccessfuly = true;
        }
        else{
            for(let i=0;i<this.items.length;i++){
                if(!this.items[i]){
                    this.items[i] = newItem;
                    itemAddedSuccessfuly = true;
                    break;
                }
            }
        }
        if(!itemAddedSuccessfuly){
            console.log("Item could not be added.")
        }
        return newItem;
    }
    equip(item){
        if(item.type==="weapon"){
            this.unequip("mainHand");
            this.equipped.mainHand = item;
            this.removeItem(item.itemKey);
        }
        else if(item.type==="armour"){
            switch(item.armourStats.equipLocation){
                case "head":
                    this.unequip("head");
                    this.equipped.head = item;
                    this.removeItem(item.itemKey);
                    break;
                case "chest":
                    this.unequip("chest");
                    this.equipped.chest = item;
                    this.removeItem(item.itemKey);
                    break;
                case "legs":
                    this.unequip("legs");
                    this.equipped.legs = item;
                    this.removeItem(item.itemKey);
                    break;
                case "feet":
                    this.unequip("feet");
                    this.equipped.feet = item;
                    this.removeItem(item.itemKey);
                    break;
                case "ring":
                    if(this.equipped.ring1){
                        this.unequip("ring2");
                        this.equipped.ring2 = item;
                    }
                    else{
                        this.unequip("ring1");
                        this.equipped.ring1 = item;
                    }
                    this.removeItem(item.itemKey);
                    break;
            }
            
        }
    }
    unequip(slot){
        let item;
        switch (slot) {
            case "mainHand":
                if (this.equipped.mainHand){
                    item = this.equipped.mainHand;
                    this.addItem(item.itemKey);
                }
                this.equipped.mainHand = null;
                break;
            case "head":
                if (this.equipped.head){
                    item = this.equipped.head;
                    this.addItem(item.itemKey);
                }
                this.equipped.head = null;
                break;
            case "chest":
                if (this.equipped.chest){
                    item = this.equipped.chest;
                    this.addItem(item.itemKey);
                }
                this.equipped.chest = null;
                break;
            case "legs":
                if (this.equipped.legs){
                    item = this.equipped.legs;
                    this.addItem(item.itemKey);
                }
                this.equipped.legs = null;
                break;
            case "feet":
                if (this.equipped.feet){
                    item = this.equipped.feet;
                    this.addItem(item.itemKey);
                }
                this.equipped.feet = null;
                break;
            case "ring1":
                if (this.equipped.ring1){
                    item = this.equipped.ring1;
                    this.addItem(item.itemKey);
                }
                this.equipped.ring1 = null;
                break;
            case "ring2":
                if (this.equipped.ring2){
                    item = this.equipped.ring2;
                    this.addItem(item.itemKey);
                }
                this.equipped.ring2 = null;
                break;
        }
    }
    removeItem(itemKey){
        for(let i=0;i<this.items.length;i++){
            if(this.items[i]){
                if(this.items[i].itemKey===itemKey){
                    this.items[i] = null;
                    return;
                }
            }
        }
    }
    isFull(){
        for(let i=0;i<this.items.length;i++){
            if(!this.items[i]){ //if there is an empty space
                return false;
            }
        }
        return true;
    }
}
class Equipped{
    constructor(equipped){
        if (!equipped) {
            this.head = null;
            this.chest = null;
            this.legs = null;
            this.feet = null;
            this.mainHand = null;
            this.ring1 = null;
            this.ring2 = null;
        }

        else{
            this.Clone(equipped);
        }
    }
    Clone(equipped){
        this.head = Item.getItem(equipped.head);
        this.chest = Item.getItem(equipped.chest);
        this.legs = Item.getItem(equipped.legs);
        this.feet = Item.getItem(equipped.feet);
        this.mainHand = Item.getItem(equipped.mainHand);
        this.ring1 = Item.getItem(equipped.ring1);
        this.ring2 = Item.getItem(equipped.ring2);
    }
    toJSON(){
        return {
            head: this.head ? this.head.itemKey : null,
            chest: this.chest ? this.chest.itemKey : null,
            legs: this.legs ? this.legs.itemKey : null,
            feet: this.feet ? this.feet.itemKey : null,
            mainHand: this.mainHand ? this.mainHand.itemKey : null,
            ring1: this.ring1 ? this.ring1.itemKey : null,
            ring2: this.ring2 ? this.ring2.itemKey : null
        }
    }
}
class CombatEncounter{
    /**
     * @param {Array} enemies | the enemies in the room
     * @param {Character} firstPlayer | the first player in the room use CHARACTER data type
     */
    constructor(room){
        this.playerTimeLimit = 20; //Seconds player has to play their turn in combat
        this.enemies = room.enemies;
        this.players = [];
        this.room = room;
        this.AddPlayer(room.players[0]);
        for(let enemy of this.enemies){
            this.setEnemyAgro(enemy,this.players[0]) //all enemies target first player in the room
        }
        this.CreateCombatRotation();
    }
    setEnemyAgro(enemy, targetedPlayer){
        enemy.target = targetedPlayer;
    }
    CreateCombatRotation(){
        this.combatRotation = [];
        let combatants = [];
        for(let player of this.players){
            combatants.push(player);
        }
        for(let enemy of this.enemies){
            combatants.push(enemy)
        }
        for(let i=combatants.length-1;i>0;i--){ //shuffle
            const j = Math.floor(Math.random()*(i+1))
            const temp = combatants[i];
            combatants[i] = combatants[j];
            combatants[j] = temp;
        }
        this.combatRotation = combatants;
        this.currentTurn = this.combatRotation[0];
        if(this.currentTurn instanceof Character){
            this.currentTurn.sendGameMessage(`<p class='gameText'><strong>It's your turn!</strong></p>`);
            this.playerTimer = this.StartPlayerTimer();
        }
        else{
            this.TakeEnemyTurn();
        }
    }
    /**
     * 
     * @param {The text the user entered} action 
     * @param {The character the user is using} character
     */
    PerformCombatAction(action, character){ //return message to be displayed
        let validAction = false;
        if(this.currentTurn instanceof Character){ //on player turn
            if(this.currentTurn === character){
                if(!validAction){
                    if(action.includes("attack")){ //on an attack command
                        validAction = true;
                        let attacked = false;
                        for(let enemy of this.enemies){
                            if(action.includes(enemy.enemyName.toLowerCase())){ //check if player included a specific enemy to attack
                                if(!attacked){
                                    attacked = true;
                                    this.Attack(character,enemy);
                                }
                                break;
                            }
                        }
                        if(!attacked){
                            attacked = true;
                            this.Attack(character, this.enemies[0]);
                        }
                    }
                    if(action.includes("flee")){
                        for (let [dir, room] of Object.entries(character.currentRoom.connections)){
                            if(room){
                                character.move(dir);
                                clearInterval(this.playerTimer);
                                break;
                            }
                        }
                    }
                }
                if(!validAction){

                }
                if(validAction){
                    clearInterval(this.playerTimer); //stops turn countdown
                }
            }
            else{//someone elses turn
                character.sendGameMessage("<p class='gameText warning'>You cannot do that on "+this.currentTurn.characterName+"'s turn...</p>");
            }
        }
        else{
            character.sendGameMessage("<p class='gameText warning'>You cannot do that on the enemies turn...</p>");
        }
    }
    
    Broadcast(message){ //sends the same message to every player in the fight
        for(let player of this.players){
            player.sendGameMessage(message);
        }
    }
    BroadcastExclude(message,skipPlayer){ //sends the same message to every player in the fight
        for(let player of this.players){
            if(player===skipPlayer){
                continue;
            }
            player.sendGameMessage(message);
        }
    }
    removeEnemy(enemy){
        this.enemies = this.enemies.filter(e => e !== enemy);
        if(this.currentTurn === enemy){
            this.NextTurn();
        }
        this.combatRotation = this.combatRotation.filter(e => e !== enemy);
        enemy.stats.removeAllListeners('death');
    }
    TakeEnemyTurn(){
        this.Broadcast(`<p class='gameText'>It's ${this.currentTurn.enemyName}'s turn!</p>`);
        setTimeout(()=>{
            if(this.currentTurn){
                this.Attack(this.currentTurn, this.currentTurn.target);
            }
        },3000)
    }

    Attack(attacker, defender){
        let attackTotal = attacker.offence - defender.defence;
        if(attackTotal>0){ //succesful attack
            if(attacker instanceof Enemy){ //enemy attacker
                this.Broadcast(`<p class='gameText'>${attacker.enemyName} hits ${defender.characterName} with it's ${Item.getItem(attacker.inventory.enemyMainHand).itemName}</p>`)
                defender.sendGameMessage(`<p class='gameText'>----You take <strong>${attackTotal}</strong> damage!----`);
            }
            else{ //Player attacker
                if(attacker.inventory.equipped.mainHand){
                    this.Broadcast(`<p class='gameText'>${attacker.characterName} hits ${defender.enemyName} with their ${attacker.inventory.equipped.mainHand.itemName}</p>`)
                }
                else{
                    this.Broadcast(`<p class='gameText'>${attacker.characterName} slaps ${defender.enemyName} with their bare hand</p>`)
                }
                this.Broadcast(`<p class='gameText'>----The ${defender.enemyName} takes <strong>${attackTotal}</strong> damage!----</p>`);
            }
            defender.stats.addHealth(-1*attackTotal);
            if(defender instanceof Character){
                defender.game.updateCharacterInfo();
            }
        } //failed attack
        else{
            if(attacker instanceof Enemy){
                this.Broadcast(`<p class='gameText'>${attacker.enemyName} tried to hit ${defender.characterName} with their ${Item.getItem(attacker.inventory.enemyMainHand).itemName}. It bounces off!</p>`)
            }
            else{
                if(attacker.inventory.equipped.mainHand){
                    this.Broadcast(`<p class='gameText'>${attacker.characterName} tried to hit ${defender.enemyName} with their ${attacker.inventory.equipped.mainHand.itemName}. It bounces off!</p>`)
                }
                else{
                    this.Broadcast(`<p class='gameText'>${attacker.characterName} slaps ${defender.enemyName} with their bare hand. It bounces off!</p>`)
                }
            }
        }
        this.NextTurn();
    }
    NextTurn(){ //Move the current turn to the next in line
        if(this.enemies.length<=0){
            this.EndEncounter();
        }
        if(this.combatRotation){
            for(let i=0;i<this.combatRotation.length;i++){
                if(this.combatRotation[i]===this.currentTurn){ //find current player
                    let nextIndex = (i + 1) % this.combatRotation.length; //go to next, or wrap to 0 if at end of array
                    this.currentTurn = this.combatRotation[nextIndex];
                    break;
                }
            }
            
            if(this.currentTurn instanceof Enemy){
                this.TakeEnemyTurn();
            }
            else{
                this.BroadcastExclude(`<p class='gameText'>It's ${this.currentTurn.characterName}'s turn!</p>`,this.currentTurn);
                this.currentTurn.sendGameMessage(`<p class='gameText'><strong>It's your turn!</strong></p>`);
                this.playerTimer = this.StartPlayerTimer();
            }
        }
    }
    AddPlayer(player){
        if(this.players.includes(player)){ //no duplicate players
            console.log("exists Player");
            return;
        }
        this.players.push(player);
        if(!this.combatRotation){
            //this.CreateCombatRotation();
        }
        else{
            this.combatRotation.push(player);
            this.Broadcast(`<p class='gameText'>${player.characterName} has joined the battle!</p>`);
        }
    }
    RemovePlayer(player){
        this.players = this.players.filter(p=>p!==player);
        if(this.currentTurn===player){
            this.NextTurn();
        }
        this.combatRotation = this.combatRotation.filter(p=>p!==player);
        if(this.players.length<=0){
            this.EndEncounter();
        }
        else{
            for(let enemy of this.enemies){ //changing enemy agro from the removed player
                if(enemy.target === player){
                    for(let p of this.players){
                        if(p!==player){
                            this.setEnemyAgro(enemy, p);
                            break;
                        }
                    }
                }
            }
        }
    }
    ToString(){
        let finalString = "";
        for(let enemy of this.enemies){
            finalString+=enemy.ToHtml();
        }
        
    }
    StartPlayerTimer(){
        let time = 0;
        const timer = setInterval(()=>{
            if(time>=this.playerTimeLimit){
                this.Attack(this.currentTurn, this.enemies[0]); //if player runs out of time, they automatically attack
                clearInterval(timer);
                return;
            }
            time++;
            if(this.playerTimeLimit-time <= 5){//the time remaining less than 5 seconds
                if(this.currentTurn instanceof Character){
                    this.currentTurn.sendGameMessage(`<p class='gameText'>Your turn ends in ${this.playerTimeLimit-time} seconds!</p>`);
                }
            }
        },1000)
        return timer;
    }
    EndEncounter(){
        if(this.playerTimer){
            clearInterval(this.playerTimer)
        };
        this.Broadcast(`<p class='gameText'>The fight has ended!</p>`);
        this.combatRotation = null;
        this.currentTurn = null;
        this.enemies = [];
        this.players = [];
        this.room.combatEncounter = null;
    }
}
module.exports = GameMaster; //export the game to the server