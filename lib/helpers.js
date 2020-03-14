const crypto = require("crypto");
const config = require("./config.js");

const helpers = {};

helpers.getHashed = (str)=>{
    if(typeof(str) == "string" && str.length>0){
        const hashedPassword = crypto.createHmac("sha256", config.hashSecret).update(str).digest('hex');
        return hashedPassword;
    }else{
        return false;
    }
}

helpers.getJsonParsedToObject = (obj)=>{
    try{
        const jsonObject = JSON.parse(obj);
        return jsonObject;
    }catch(error){
        console.log(error);
        return false;
    }
}

helpers.createRandomString = (strLength) => {
    if(strLength && typeof(strLength)=="number" && strLength > 0){
        const possibleCharacters = "qwertyuiopasdfghjklzxcvbnm0123456789";
        let randomString="";
        for(let i=1;i<=strLength;i++){
            randomString+=possibleCharacters[Math.floor(Math.random()*possibleCharacters.length)];
        }
        return randomString;
    }
    else{
        console.log(typeof(strLength));
        console.log("strlength is not a valid number");
        return false;
    }
}

module.exports = helpers;