/**
 * @Author Ben judson
 * @Date 26/Nov/2025
 */

const maxAbilityPoints = 20;
let availablePoints = maxAbilityPoints;
let stats = {
    strength: 0,
    dexterity: 0,
    faith: 0,
    luck: 0
}
$(document).ready(()=>{
    ResetAbilityPoints();
    $("#characterForm").on("submit",OnCharacterSubmit)
})

function OnCharacterSubmit(e){
    e.preventDefault();
    let characterData = {
        characterName: $('#characterName').val(),
        sex: $('#maleRdo').prop("checked") ? "male" : "female",
        stats: stats,
        class: $('#classInput').val()
    }
    if(checkValidInfo(characterData)){
        $.ajax({
            url: '/game/newCharacter',
            method: 'post',
            contentType: 'application/json',
            data: JSON.stringify(characterData),
            success: function (res){
                window.location.replace(res);
            }
        })
    }
}

function checkValidInfo(data){
    let errorText = $('#errorText');
    if(data.characterName){
        if(data.sex){
            if(data.stats){
                if(data.class){
                    if($('#pointsAvailable').html()==="0"){
                        errorText.html("");
                        return true;
                    }
                    else{
                        errorText.html("You haven't spent all your ability points...");
                    }
                }
                else{
                    errorText.html("Please select a class...");
                }
            }
            else{
                errorText.html("You haven't set your stats...");
            }
        }
        else{
            errorText.html("Please choose a sex for your character...");
        }
    }
    else{
        errorText.html("Please name your character...");
    }
    return false;
}
function ResetAbilityPoints(){
    $('#pointsAvailable').html(maxAbilityPoints);

    for(let stat in stats){
        stats[stat] = 0;
        $(`#${stat}Input`).html(stats[stat]);
        $(`#${stat}UpArrow`).off('click').on('click',()=>addPoints(stat,1));
        $(`#${stat}DownArrow`).off('click').on('click',()=>addPoints(stat,-1));
    }
}

function addPoints(statName, amount){
    if(availablePoints>0){
        for(let stat in stats){
            if(statName===stat){
                if(stats[stat]+amount<0){
                    console.log('stat cannot go below 0')
                }
                else{
                    availablePoints-=amount;
                    stats[stat] += amount;
                    $(`#${statName}Input`).html(stats[statName]);
                    $('#pointsAvailable').html(availablePoints);
                    return;
                }
            }
        }
    }
    else{
        console.log('cannot add any more points')
    }
}