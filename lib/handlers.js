const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");
const https = require("https");

//Menu Items
const menuItems = [
    {
        id:1,
        name:"Burgers",
        price : 10,
        skuId : "sku_HCQsLBSweUIHAb" ,
    },
    {
        id:2,
        name:"Fries",
        price : 20,
        skuId : "sku_HCQtdkjrZIBQtb",
    },
    {
        id:3,
        name:"Pizza",
        price : 30,
        skuId : "sku_HCQu5lHCOU8Z0g",
    },
    {
        id:4,
        name:"Lava Cake",
        price : 30,
        skuId : "sku_HCQuFZFa6PSB9S",
    },
    {
        id:5,
        name:"Coke",
        price : 25,
        skuId : "sku_HCQvRTQ8mCPniB",
    }
]

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
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >= 1 && data.payload.email.indexOf(".com") >= -1 ? data.payload.email : false;
    const address = typeof(data.payload.address) === "object" && 
        data.payload.address.line1.length >= 1 && 
        data.payload.address.city.length >=1 &&
        data.payload.address.state.length >=1 &&
        data.payload.address.country.length >=1 &&
        data.payload.address.postal_code.length >=1 ? data.payload.address : false;
    const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;

    if(firstName &&  lastName && email && address){
        //Check if the user already exists
        _data.read("users", email, (error, data)=>{
            if(error){
                const hashedPassword = helpers.getHashed(password);
                if(hashedPassword){
                    const cartId = helpers.createRandomString(20);
                    const userObject = {
                        firstName,
                        lastName,
                        email,
                        address,
                        password:hashedPassword,
                        cartId,
                    }
                    _data.create('users', email, userObject, (error)=>{
                        if(error){
                            callback(500, {Error : "Could not create user"});
                        }else{
                            const cart = {
                                id : cartId,
                                email,
                                items:[],
                            };
                            _data.create("carts", cartId, cart, (error)=>{
                                if(error){
                                    callback(500, {Error:"Failed to create a cart for the user"});
                                }else{
                                    callback(200, {Message:"User with a cart created successfully"});
                                }
                            })
                        }
                    });
                }
                else{
                    callback(500, {Error : "Could not hash the password."});
                }
            }else{
                callback(400, {Error : "User with the same email id already exists."});
            }
        })
    }else{
        callback(400,{Error : "Missing required fields."})
    }
}

//Get method for users
handlers._users.get = (data, callback)=>{
    const email = typeof(data.queryStringsObject.email) === "string" && data.queryStringsObject.email.length >=1 ? data.queryStringsObject.email : false;
    if(email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                _data.read("users",email, (error, userData)=>{
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
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >= 1 ? data.payload.email : false;
    if(email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                const firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.length >= 1 ? data.payload.firstName : false;
                const lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.length >= 1 ? data.payload.lastName : false;
                const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;
                const address = typeof(data.payload.address) === "object" ? data.payload.address : {};
                const { line1 , city, state, country, postal_code } = address;

                if(firstName || lastName || password || address){
                    _data.read("users",email, (error, userData)=>{
                        if(!error && userData){
                            userData.firstName = firstName || userData.firstName;
                            userData.lastName = lastName || userData.lastName;
                            userData.address = {
                                ...userData.address,
                                line1 : line1 || userData.address.line1,
                                city : city || userData.address.city,
                                state : state || userData.address.state,
                                country : country || userData.address.country,
                                postal_code : postal_code || userData.address.postal_code,
                            };
                            if(password){
                                const hashedPassword = helpers.getHashed(password);
                                userData.password = hashedPassword;
                            }
                            _data.update("users",email, userData,(error)=>{
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
    const email = typeof(data.queryStringsObject.email) === "string" && data.queryStringsObject.email.length >= 1 ? data.queryStringsObject.email : false;
    if(email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                //Check if a valid phone number
                _data.read("users", email, (error, userData)=>{
                    if(!error && userData){
                        _data.delete("users",email,(error)=>{
                            if(!error){
                                callback(200, "User deleted successfully");
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
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >= 1 ? data.payload.email : false;
    const password = typeof(data.payload.password) === "string" && data.payload.password.length >= 1 ? data.payload.password : false;

    if(email && password){
        //Check if the user already exists
        _data.read("users", email, (error, userData)=>{
            if(!error && userData){
                //Generate a token
                const hashedPassword = helpers.getHashed(password);
                if(hashedPassword == userData.password){
                    const tokenId = helpers.createRandomString(20);
                
                    //Create the tokenObject
                    const tokenObject = {
                        email,
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
                callback(400, {Error : "Could not find user with the same email id"});
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
    const id = typeof(data.queryStringsObject.id) === "string" && data.queryStringsObject.id.length == 20 ? data.queryStringsObject.id : false;
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
handlers._tokens.verifyToken = (token, email, callback)=>{
    _data.read("tokens",token, (error, tokenData)=>{
        if(!error && tokenData){
            if(tokenData.email===email){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            callback(false);
        }
    })
}

//Handler for menu
handlers.menu=(data, callback)=>{
    const acceptedMethods = ["GET"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._menu[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for the menu submethods
handlers._menu = {};

//Get method for menu
handlers._menu.get = (data, callback)=>{
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >= 1 && data.payload.email.indexOf(".com") >= -1 ? data.payload.email : false;
    if(email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                //Return the menu
                callback(false, menuItems);

            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    }else{
        callback(403,{Error: "Missing user email"});
    }
}

//Handler for cart
handlers.cart=(data, callback)=>{
    const acceptedMethods = ["GET","POST"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._cart[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for the cart submethods
handlers._cart = {};

//Post method for cart
handlers._cart.post = (data, callback)=>{
    const id = typeof(data.payload.id) === "number" && data.payload.id >=1 ? data.payload.id : false;
    const quantity = typeof(data.payload.quantity) === "number" && data.payload.quantity >=1 ? data.payload.quantity : false;
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >=1 ? data.payload.email : false;

    if(id && quantity && email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                _data.read("users",email, (error, userData)=>{
                    if(!error && userData){
                        const { cartId } = userData;
                        _data.read("carts", cartId, (error, cartData)=>{
                            if(!error && cartData){
                                if(cartData.activeOrderId){
                                    callback(200, {Error:`You already have an active order with id ${cartData.activeOrderId}. Kindly pay it or cancel it to order more...`});
                                }
                                else{
                                    const itemFromMenu = menuItems.find((item)=>item.id===id);

                                    //Look if the item already exists else add
                                    const { items } = cartData;
                                    const itemInCart = items.find((item)=>item.id===id);
                                    if(itemInCart){
                                        itemInCart.quantity = quantity;
                                        itemInCart.amount = itemFromMenu.price*quantity;
                                    }else{
                                        items.push({
                                            id,
                                            quantity,
                                            skuId : itemFromMenu.skuId,
                                            amount : itemFromMenu.price*quantity,
                                        })
                                    };

                                    const newCartData = {
                                        ...cartData,
                                        items,
                                    };

                                    //Save the new items in the cart
                                    _data.update("carts",cartId, newCartData,(error)=>{
                                        if(!error){
                                            callback(200, {Message : "Cart successfully updated"});
                                        }
                                    })
                                }
                            }else{
                                callback(500, {Error : "The cart for this user could not be found"});
                            }
                        })
                        
                    } else{
                        callback(404, {Error:"The user does not exist"});
                    }
                })
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    } else{
        callback(403,{Error:"Missing required fields in payload"});
    }
}

//Post method for cart
handlers._cart.get = (data, callback)=>{
    const id = typeof(data.queryStringsObject.id) === "string" && data.queryStringsObject.id.length >=1 ? data.queryStringsObject.id : false;
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >=1 ? data.payload.email : false;

    if(id && email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                _data.read("carts",id, (error, cartData)=>{
                    if(!error && cartData){
                        delete cartData.id;
                        delete cartData.email;
                        callback(200, cartData);
                    } else{
                        callback(404, {Error:"The cart does not exist"});
                    }
                })
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    } else{
        callback(403,{Error:"Missing required fields in payload"});
    }
}

//Handler for order
handlers.order=(data, callback)=>{
    const acceptedMethods = ["POST"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._order[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for order submethods
handlers._order = {};

//Post method for order
handlers._order.post = (data, callback)=>{
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >=1 ? data.payload.email : false;
    if(email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                _data.read("users",email, (error, userData)=>{
                    if(!error && userData){
                        const {cartId} = userData;
                        _data.read("carts",cartId,(error, cartData)=>{
                            if(!error && cartData){
                                const {items, activeOrderId} = cartData;
                                if(activeOrderId){
                                    //You already have a pending order
                                    callback(200, { Message : `You already have a pending order ${activeOrderId}` });
                                }
                                else if(!items.length){
                                    //No order can be made since the cart is empty
                                    callback(200, { Message : "Your cart is empty..." });
                                }else{
                                    const authCode = Buffer.from(`${config.stripe_secret}:`).toString("base64");
                                    let postData = "currency=usd&&email="+email+"&&"+
                                    "shipping[name]="+userData.firstName+ " " + userData.lastName +"&&"+
                                    "shipping[address][line1]="+userData.address.line1+"&&"+
                                    "shipping[address][city]="+userData.address.city+"&&"+
                                    "shipping[address][state]="+userData.address.state+"&&"+
                                    "shipping[address][country]="+userData.address.country+"&&"+
                                    "shipping[address][postal_code]="+userData.address.postal_code;

                                    for(let i=0;i<items.length;i++){
                                        postData+="&&items["+i+"][parent]="+items[i].skuId+"&&items["+i+"][quantity]="+items[i].quantity;
                                    }

                                    const requestDetails = {
                                        hostname : "api.stripe.com",
                                        method : "POST",
                                        path:'/v1/orders',
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
                                            //console.log("result : ", result);
                                            const status = response.statusCode;
                                            const jsonResult = JSON.parse(result);
                                            const { id } = jsonResult;
                                            //Update the cart with the active order id
                                            _data.update("carts",cartId, {...cartData, activeOrderId : id}, (error)=>{
                                                if(!error){
                                                    callback(false, {Message : `Order with id : ${id} placed successfully`});
                                                }else{
                                                    callback(status,`Status code returned was ${status}`);
                                                }
                                            })

                                        });
                                        response.on('error', function (err) {
                                            console.log(err);
                                        })
                                    });
                            
                                    req.on("error", (error)=>{
                                        console.log("error : ",error);
                                        callback(error);
                                    });

                                    req.write(postData);

                                    //Send the request
                                    req.end();
                                }
                            }else{
                                callback(500,{Error:"Could not find the cart for the user"});
                            }
                        })
                    } else{
                        callback(500, {Error:"Could not find the user"});
                    }
                })
            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    }else{
        callback(403, {Error:"Missing required field"});
    }
}

//Handler for payment
handlers.payment=(data, callback)=>{
    const acceptedMethods = ["POST"];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._payment[data.method.toLowerCase()](data, callback);
    }
    else{
        callback(405);
    }
}

//Container for payment submethods
handlers._payment = {};

//Post method for payment
handlers._payment.post = (data, callback)=>{
    const orderId = typeof(data.payload.orderId) === "string" && data.payload.orderId.length >=1 ? data.payload.orderId : false;
    const email = typeof(data.payload.email) === "string" && data.payload.email.length >=1 ? data.payload.email : false;
    if(orderId && email){
        //Extract the token from the header
        const token = data.headers.token;
        handlers._tokens.verifyToken(token, email, (isTokenValid)=>{
            if(isTokenValid){
                //Make payment
                const authCode = Buffer.from(`${config.stripe_secret}:`).toString("base64");
                let postData = "source=tok_mastercard&&email="+email;


                const requestDetails = {
                    hostname : "api.stripe.com",
                    method : "POST",
                    path:`/v1/orders/${orderId}/pay`,
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
                        //Update the cart to take further orders
                        _data.read("users",email,(error, userData)=>{
                            if(!error && userData){
                                const {cartId} = userData;
                                _data.read("carts", cartId, (error, cartData)=>{
                                    if(!error && cartData){
                                        delete cartData.activeOrderId;
                                        _data.update("carts", cartId, {...cartData, items:[]}, (error)=>{
                                            if(!error){
                                                //Mail the user the receipt
                                                const subject = "Receipt for Payment";
                                                const text = `Payment made successfully for Order : ${orderId}`;
                                                helpers.sendEmail(email, subject, text);

                                                callback(200, {Message : `Successfully paid for order ${orderId}`});
                                            }
                                            else{
                                                callback(500, {Error:"Failed to update the cart with the paid order"});
                                            }
                                        })
                                    }else{
                                        callback(500, {Error : "Could not find the cart to update the paid order"})
                                    }
                                })
                            }else{
                                callback(500, {Error:"Could not find the user"});
                            }
                        })

                    });
                    response.on('error', function (err) {
                        console.log(err);
                    })
                });
        
                req.on("error", (error)=>{
                    console.log("error : ",error);
                    callback(error);
                });

                req.write(postData);

                //Send the request
                req.end();

            }else{
                callback(403, {Error:"Missing required token in the header or the token is invalid"});
            }
        })
    }else{
        callback(403, {Error:"Missing required field"});
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