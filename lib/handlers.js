const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

//The handler object with all the handlers
const handlers={};

//Handler for users
handlers.users=(data, callback)=>{
    const acceptedMethods = ["GET", "POST", "DELETE", "PUT"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._users[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for the users submethods
handlers._users = {};

//Post method for users
handlers._users.post = (data, callback)=>{
    const firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.length >= 1 ? data.payload.firstName : false;
    const lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.length >= 1 ? data.payload.lastName : false;
    const phone = typeof(data.payload.phone) === "string" && data.payload.phone.length == 10 ? data.payload.phone : false;
    const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;

    if(firstName &&  lastName && phone && password){
        //Check if the user already exists
        _data.read("users", phone, (error, data)=>{
            if(error){
                const hashedPassword = helpers.getHashed(password);
                if(hashedPassword){
                    const userObject = {
                        firstName,
                        lastName,
                        phone,
                        password:hashedPassword
                    }
                    _data.create('users', phone, userObject, (error)=>{
                        if(error){
                            console.log(error);
                            callback(500, {Error : "Could not create user"});
                        }else{
                            callback(200, {});
                        }
                    });
                }
                else{
                    callback(500, {Error : "Could not hash the password."});
                }
            }else{
                callback(400, {Error : "User with the same phone number already exists."});
            }
        })
    }else{
        callback(400,{Error : "Missing required fields."})
    }
}

//Get method for users
handlers._users.get = (data, callback)=>{
    const phone = typeof(data.queryStringsObject.phone) === "string" && data.queryStringsObject.phone.length == 10 ? data.queryStringsObject.phone : false;
    if(phone){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, phone, (isTokenValid)=>{
            if(isTokenValid){
                _data.read("users",phone, (error, userData)=>{
                    if(!error && userData){
                        delete userData.password;
                        callback(200, userData);
                    } else{
                        callback(404, {Error:"The user does not exist"});
                    }
                })
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    } else{
        callback(403, {Error:"Missing required field"});
    }
}

//Get method for users
handlers._users.put = (data, callback)=>{
    const phone = typeof(data.payload.phone) === "string" && data.payload.phone.length == 10 ? data.payload.phone : false;
    if(phone){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, phone, (isTokenValid)=>{
            if(isTokenValid){
                const firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.length >= 1 ? data.payload.firstName : false;
                const lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.length >= 1 ? data.payload.lastName : false;
                const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;
                if(firstName || lastName || password){
                    _data.read("users",phone, (error, userData)=>{
                        if(!error && userData){
                            userData.firstName = firstName || userData.firstName;
                            userData.lastName = lastName || userData.lastName;
                            if(password){
                                const hashedPassword = helpers.getHashed(password);
                                userData.password = hashedPassword;
                            }
                            _data.update("users",phone, userData,(error)=>{
                                if(!error){
                                    callback(200);
                                }else{
                                    callback(500,{Error:"Failed to update the user details"});
                                }
                            })
                        }else{
                            callback(404,{Error:"The user does not exist"});
                        }
                    })    
                } else{
                    callback(403, {Error:"Atleast one field is required for update"});
                }
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    } else{
        callback(403, {Error:"Missing required field"});
    }
}

//Delete method for users
handlers._users.delete = (data, callback)=>{
    const phone = typeof(data.queryStringsObject.phone) === "string" && data.queryStringsObject.phone.length == 10 ? data.queryStringsObject.phone : false;
    if(phone){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, phone, (isTokenValid)=>{
            if(isTokenValid){
                //Check if a valid phone number
                _data.read("users", phone, (error, userData)=>{
                    if(!error && userData){
                        _data.delete("users",phone,(error)=>{
                            if(!error){
                                //Delete all the checks associated with the user
                                const checks = userData.checks || [];
                                let deletedChecksCount = 0;
                                let checksCompleted=0
                                checks.forEach(check => {
                                    _data.delete("checks", check, (error)=>{
                                        if(!error){
                                            deletedChecksCount+=1;
                                        }
                                        checksCompleted+=1;
                                        if(checksCompleted == checks.length){
                                            if(deletedChecksCount!==checks.length){
                                                callback(500, {Error:"Failed to delete some of the checks for the user"});
                                            }else{
                                                callback(200);
                                            }
                                        }
                                    })
                                });
                            }else{
                                callback(500,{Error:"Failed to delete the user"});
                            }
                        })
                    }else{
                        callback(404,{Error : "The user does not exist"});
                    }
                })
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    }else{
        callback(405, {Error:"Missing required fields"});
    }
}

//Handler for tokens
handlers.tokens = (data, callback)=>{
    const acceptedMethods = ["GET", "POST", "DELETE", "PUT"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for the tokens submethods
handlers._tokens = {};

//Post method for tokens
handlers._tokens.post = (data, callback)=>{
    const phone = typeof(data.payload.phone) === "string" && data.payload.phone.length == 10 ? data.payload.phone : false;
    const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;
    console.log(data);

    if(phone && password){
        //Check if the user already exists
        _data.read("users", phone, (error, userData)=>{
            if(!error && userData){
                console.log("userData : ",userData);
                //Generate a token
                const hashedPassword = helpers.getHashed(password);
                if(hashedPassword == userData.password){
                    const tokenId = helpers.createRandomString(20);
                
                    //Create the tokenObject
                    const tokenObject = {
                        phone,
                        id:tokenId,
                        expires:Date.now() + 60*60*1000,
                    }

                    //Store the tokenObject
                    _data.create("tokens", tokenId, tokenObject, (error)=>{
                        if(!error){
                            callback(200, tokenObject);
                        } else{
                            console.log(error);
                            callback(500, {Error: "Failed to create a tokenSet fot the user"});
                        }
                    })
                } else{
                    callback(400, {Error : "The password sent for the user doesnt match"});
                }
            }else{
                callback(400, {Error : "Could not find user with the same phone number"});
            }
        })
    }else{
        callback(400,{Error : "Misssssing required field(s)"})
    }
}

//Get method for tokens
handlers._tokens.get = (data, callback)=>{
    if(typeof(data.queryStringsObject.id)=="string"){
        //Check if a valid id
        _data.read("tokens", data.queryStringsObject.id, (error, data)=>{
            if(!error && data){
                delete data.password;
                callback(200,data);
            }else{
                callback(404,{Error : "Could not find the user."});
            }
        })
    }else{
        callback(405, {Error:"Missing required fields"});
    }
}

//Put method for tokens
handlers._tokens.put = (data, callback)=>{
    const id = typeof(data.payload.id) === "string" && data.payload.id.length == 20 ? data.payload.id : false;
    const extend = typeof(data.payload.extend) === "boolean" && data.payload.extend == true ? data.payload.extend : false;

    if(id && extend){
        _data.read("tokens", id, (error, tokenData)=>{
            if(!error && tokenData){
                if(tokenData.expires > Date.now()){
                    tokenData.expires = Date.now() + 60*60*1000;
                    _data.update("tokens",id, tokenData, (error)=>{
                        if(!error){
                            callback(200);
                        }else{
                            callback(500, {Error:"Failed to extend the token"});
                        }
                    })
                } else{
                    callback(400, {Error:"The token has alredy expired. It cannot be extended"});
                }
            }else{
                callback(400, {Error:"The specified token does not exist"});
            }
        })
    }else{
        callback(400, {Error:"Missing required field(s)"});
    }
}

//Delete method for tokens
handlers._tokens.delete = (data, callback)=>{
    const id = typeof(data.queryStringsObject.id) === "string" && data.queryStringsObject.id.length == 20 ? data.payload.id : false;
    if(id){
        _data.read("tokens",id, (error, tokenData)=>{
            if(!error && tokenData){
                _data.delete("tokens",id, (error)=>{
                    if(!error){
                        callback(200);
                    }else{
                        callback(500, {Error:"Faield to delete the token"});
                    }
                })
            } else{
                callback(400, {Error:"Could not find the specified user"});
            }
        })
    }else{
        callback(400,{Error:"Missing required field"});
    }
}

//Verify the token for a user
handlers._tokens.verifyToken = (token, phone, callback)=>{
    _data.read("tokens",token, (error, tokenData)=>{
        if(!error && tokenData){
            if(tokenData.phone===phone){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            callback(false);
        }
    })
}

//Handler for checks
handlers.checks=(data, callback)=>{
    const acceptedMethods = ["GET", "POST", "DELETE", "PUT"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._checks[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for the checks submethods
handlers._checks = {};

//Post method for checks
handlers._checks.post = (data, callback)=>{
    const protocol = typeof(data.payload.protocol) === "string" && ["https","http"].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === "string" && data.payload.url.length > 1 ? data.payload.url : false;
    const method = typeof(data.payload.method) === "string" && ["post","get","put","delete"].includes(data.payload.method) ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array ? data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(protocol && url && method && successCodes && timeoutSeconds){
        //Extract the token from the header
        const token = data.headers.token;
        _data.read("tokens",token, (error, tokenData)=>{
            if(!error && tokenData){
                const phone = tokenData.phone;
                _data.read("users",phone, (error, userData)=>{
                    if(!error && userData){
                        const checks = userData.checks;
                        if(!checks || checks.length < config.maxChecks){
                            const checkId = helpers.createRandomString(20);
                            const checkObject = {
                                id:checkId,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds,
                                userPhone:phone,
                            };
                            _data.create("checks", checkId, checkObject, (error)=>{
                                if(!error){
                                    userData.checks = checks || [];
                                    userData.checks.push(checkId);
                                    _data.update("users",phone, userData, (error)=>{
                                        if(!error){
                                            callback(200, checkObject);
                                        }else{
                                            callback(500, {Error:"Failed to update user with the new check details"});
                                        }
                                    })
                                } else{
                                    callback(500,{Error:"Failed to create the check"});
                                }
                            })
                        }else{
                            callback(403,{Error:"The user already has a max checks count of 5"});
                        }
                    }else{
                        callback(404,{Error:"The user could not be found"});
                    }
                })
            } else{
                callback(403, {Error:"The token is invalid"});
            }
        });
    } else{
        callback(400,{Error:"Missing required field(s)"});
    }
}

//Get method for checks
handlers._checks.get = (data, callback)=>{
    const id = typeof(data.queryStringsObject.id) === "string" && data.queryStringsObject.id.length === 20 ? data.queryStringsObject.id : false;
    if(id){
        _data.read("checks",id, (error, checkData)=>{
            if(!error && checkData){
                const token = data.headers.token;
                handlers._tokens.verifyToken(token, checkData.userPhone, (isTokenValid)=>{
                    if(isTokenValid){
                        callback(200, checkData);
                    }else{
                        callback(403,{Error:"The token is invalid"});
                    }
                })
            }else{
                callback(403, {Error:"Could not find the check details"});
            }
        })
    }else{
        callback(403, {Error:"Missing required field"});
    }
}

//Put method for checks
handlers._checks.put = (data, callback)=>{
    const id = typeof(data.payload.id) === "string" && data.payload.id.length === 20 ? data.payload.id : false;
    const protocol = typeof(data.payload.protocol) === "string" && ["https","http"].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === "string" && data.payload.url.length > 1 ? data.payload.url : false;
    const method = typeof(data.payload.method) === "string" && ["post","get","put","delete"].includes(data.payload.method) ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array ? data.payload.url : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if(id && (protocol || url || method || successCodes || timeoutSeconds)){
        _data.read("checks", id, (error, checkData)=>{
            if(!error && checkData){
                const token = data.headers.token;
                handlers._tokens.verifyToken(token, checkData.userPhone,(isTokenValid)=>{
                    if(isTokenValid){
                        checkData.protocol = protocol || checkData.protocol;
                        checkData.url = url || checkData.url;
                        checkData.method = method || checkData.method;
                        checkData.successCodes = successCodes || checkData.successCodes;
                        checkData.timeoutSeconds = timeoutSeconds || checkData.timeoutSeconds;

                        _data.update("checks", id, checkData, (error)=>{
                            if(!error){
                                callback(200, checkData);
                            } else{
                                callback(500, {Error : "Faield to update the check details"});
                            }
                        })
                    }else{
                        callback(403,{Error:"The token is invalid"});
                    }
                });
            }else{
                callback(404, {Error:"The check id specified does not exist"});
            }
        });
    }else{
        callback(403, {Error:"Missing required field(s)"});
    }
}

//Delete method for checks
handlers._checks.delete = (data, callback)=>{
    const id = typeof(data.queryStringsObject.id) === "string" && data.queryStringsObject.id.length === 20 ? data.queryStringsObject.id : false;
    if(id){
        _data.read("checks",id, (error, checkData)=>{
            if(!error && checkData){
                const token = data.headers.token;
                handlers._tokens.verifyToken(token, checkData.userPhone, (isTokenValid)=>{
                    if(isTokenValid){
                        _data.delete("checks", id, (error)=>{
                            if(!error){
                                //Delete the check id from the users record
                                _data.read("users", checkData.userPhone, (error, userData)=>{
                                    if(!error && checkData){
                                        const checks = userData.checks || [];
                                        const checkIndex = checks.indexOf(id);
                                        if(checkIndex>-1){
                                            checks.splice(checkIndex, 1);
                                            userData.checks = checks;
                                            _data.update("users", checkData.userPhone, userData, (error)=>{
                                                if(!error){
                                                    callback(200);
                                                }else{
                                                    callback(500, {Error:"Failed to delete check from the users data"});
                                                }
                                            })
                                        }
                                        else{
                                            callback(500,{Error:"Could not find the check on the user"});
                                        }

                                    }else{
                                        callback(500, {Error:"The user doesnt exist"});
                                    }
                                })
                            }else{
                                callback(500, {Error:"Failed to delete check"});
                            }
                        })
                    }else{
                        callback(400, {Error:"The token doesnt exist or is invalid"});
                    }
                })
            }else{
                callback(400, {Error:"The check id does not exist"});
            }
        })
    }else{
        callback(400, {Error:"Missing required field"});
    }
}

//Handler for sample
handlers.sample=(data, callback)=>{
    callback(406, {name:"sample handler"});
}
  
//Handler for Not found
handlers.notFound=(data, callback)=>{
    callback(404);
}

module.exports = handlers;