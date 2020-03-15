/*
 * Primary file for the API
 */
const server = require("./lib/server");
const workers = require("./lib/workers");

const app = {
  init : ()=>{
    server.init();
    workers.init();
  }
}

//Start the app
app.init();