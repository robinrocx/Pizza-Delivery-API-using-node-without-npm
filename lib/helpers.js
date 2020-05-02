const crypto = require("crypto");
const config = require("./config.js");
const queryString = require("querystring");
const https = require("https");

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

helpers.sendTwilioSms = (phone, message, callback) => {
    phone = typeof(phone) === "string" && phone.length == 10 ? phone.trim() : false;
    message = typeof(message) === "string" && message.length <= 1600 ? message.trim() : false;

    if(phone && message){
        const payload = {
            From : config.twilio.fromPhone,
            To : `+91${phone}`,
            Body : message,            
        };

        const stringPayload = queryString.stringify(payload);

        const requestDetails = {
            protocol : "http:",
            hostname : "api.twilio.com",
            method : "POST",
            path : `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            auth : `${config.twilio.accountSid}:${config.twilio.authToken}`,
            headers : {
                "Content-Type" : "application/x-www-form-url-encoded",
                "Content-Length" : Buffer.byteLength(stringPayload),
            }
        };

        const req = http.request(requestDetails, (response)=>{
            const status = response.statusCode;
            if(status == 200 || status == 201 || status == 301){
                callback(false);
            }else{
                callback(`Status code returned was ${status}`);
            }
        });

        req.on("error", (error)=>{
            callback(error);
        });

        req.write(stringPayload);

        //Send the request
        req.end();

    }else{
        callback("Given parameters are missing or invalid");
    }
}

helpers.sendEmail = (to, subject, body)=>{
    const mailData = "from=robin@getproperly.com&&"+
        "to="+to+"&&"+
        "subject="+subject+"&&"+
        "text="+body;

    console.log(mailData);
    console.log(config.mailgun_api_key);

    const authCode = Buffer.from(`api:${config.mailgun_api_key}`).toString("base64");
    const requestDetails={
        hostname : "api.mailgun.net",
        method : "POST",
        path:'/v3/sandboxf5663919438946ada1631e6eaed2de46.mailgun.org/messages',
        headers : {
            "Content-Type" : "application/x-www-form-urlencoded",
            "Authorization": `Basic ${authCode}`
        }
    };

    const req = https.request(requestDetails, (response)=>{
        var result = '';
        response.on('data', function (chunk) {
            result += chunk;
        });
        response.on('end', function () {
            console.log("result : ",result);
            console.log("Successfully Mailed...");
        });
        response.on('error', function (err) {
            console.log(err);
        })
    });

    req.on("error", (error)=>{
        console.log("error : ",error);
    });

    req.write(mailData);

    //Send the request
    req.end();
    
}

module.exports = helpers;