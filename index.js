/*
 * Primary file for the API
 */
const server = require("./lib/server");

const app = {
  init : ()=>{
    server.init();
  }
}

//Start the app
app.init();