/*
 * File for the worker tasks
 */
const _data = require("./data");
const url = require("url");
const http = require("http");
const helpers = require("./helpers");

const workers = {
    performChecks : ()=>{
        //Gather all the checks
        _data.list("checks", (error, originalCheckData)=>{
            if(originalCheckData.length){
                for(const originalCheck of originalCheckData){
                    _data.read("checks", originalCheck, (error, checkData)=>{
                        if(!error && checkData){
                            const verifiedOriginalCheckData = workers.verifyTheChecks(checkData);
                            if(verifiedOriginalCheckData){
                                workers.processCheck(verifiedOriginalCheckData);
                            }else{
                                console.log(`Could not perform the check for check id ${originalCheck.id}`);
                            }
                        }else{
                            console.log(`Failed to read the check data for check Id ${originalCheck}`);
                        }
                    })
                }
            }else{
                console.log("Error : No checks found to perform");
            }
        })
    },
    processCheck : (originalCheck)=>{
        const parsedUrl = url.parse(`${originalCheck.protocol}://${originalCheck.url}`, true);
        const path = parsedUrl.path;
        const hostname = parsedUrl.hostname;
        const requestDetails = {
            protocol : `${originalCheck.protocol}:`,
            hostname,
            method : `${originalCheck.method.toUpperCase()}`,
            path,
            timeout : originalCheck.timeoutSeconds*1000,
        };
        const outcome = {
            error:false,
            value:false,
        }
        let outcomeSent = false;

        const req = http.request(requestDetails, (response)=>{
            const status = response.statusCode;

            outcome.error = false;
            outcome.value = originalCheck;
            outcome.status = status;

            if(!outcomeSent){
                workers.processOutcome(originalCheck, outcome);
                outcomeSent=true;
            }
        });

        req.on("error", (error)=>{
            outcome.error = true;
            outcome.value = originalCheck;

            if(!outcomeSent){
                workers.processOutcome(originalCheck, outcome);
                outcomeSent=true;
            }
        });

        req.on("timeout",(error)=>{
            outcome.error = true;
            outcome.value = originalCheck;

            if(!outcomeSent){
                workers.processOutcome(originalCheck, outcome);
                outcomeSent=true;
            }
        })

        req.end();
    },
    processOutcome : (originalCheck, outcome)=>{
        const state = !outcome.error && outcome.status && originalCheck.successCodes.includes(outcome.status) ? "up" : "down";
        const isAlertNeeded = state !== originalCheck.state ? true : false;

        const newCheckData = {
            ...originalCheck,
            state,
            lastChecked : Date.now(),
        }

        _data.update("checks", originalCheck.id, newCheckData, (error)=>{
            if(!error){
                if(isAlertNeeded){
                    workers.alertUser(newCheckData);
                }
                else{
                    console.log("No need to update user of status change");
                }
            }
        })
    },
    alertUser : (newCheckData)=>{
        const message = `Alert : Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
        helpers.sendTwilioSms(newCheckData.userPhone, message, (error)=>{
            if(!error){
                console.log("Successfully alerted the user of a status change, ", message);
            }else{
                console.log("Error : Could not alert the user of the status change");
            }
        });
    },
    verifyTheChecks : (originalCheck)=>{
        const protocol = typeof(originalCheck.protocol) === "string" && ["https","http"].includes(originalCheck.protocol) ? originalCheck.protocol : false;
        const url = typeof(originalCheck.url) === "string" && originalCheck.url.length > 1 ? originalCheck.url : false;
        const method = typeof(originalCheck.method) === "string" && ["post","get","put","delete"].includes(originalCheck.method) ? originalCheck.method : false;
        const successCodes = typeof(originalCheck.successCodes) === "object" && originalCheck.successCodes instanceof Array ? originalCheck.url : false;
        const timeoutSeconds = typeof(originalCheck.timeoutSeconds) === "number" && originalCheck.timeoutSeconds % 1 === 0 && originalCheck.timeoutSeconds >= 1 && originalCheck.timeoutSeconds <= 5 ? originalCheck.timeoutSeconds : false;

        const state = typeof(originalCheck.state) === "string" && ["up","down"].includes(originalCheck.state) ? originalCheck.state : "down";
        const lastChecked = typeof(originalCheck.lastChecked) === "number" && originalCheck.lastChecked % 1 === 0 && originalCheck.lastChecked >= 0 ? originalCheck.lastChecked : false;

        originalCheck.state = state;
        originalCheck.lastChecked = lastChecked;

        if(protocol
            && url 
            && method
            && successCodes
            && timeoutSeconds
            ){
                return originalCheck;
        }

        return false;
    },
    scheduleChecks : ()=>{
        setInterval(()=>{
            workers.performChecks();
        }, 5*1000)
    },
    init : ()=>{
        //Start the checks immediately
        workers.performChecks();

        //Trigger the loop to performs checks regularly
        workers.scheduleChecks();
    }
};

module.exports = workers;