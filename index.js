
/*
* Primary file for the API
*
*
*/

//Dependencies
const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

const httpServer = http.createServer((req, res)=>{
  unifiedServer(req,res);
});

//Start the https server to listen to all requests
httpServer.listen(config.httpPort,()=>{
  console.log(`Listening to requests on port ${config.httpPort} in ${config.envName} mode`);
})

const unifiedServer = (req,res)=>{
  //Extract the url from the request and parse it
  const parsedUrl = url.parse(req.url,true);

  //Extract the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g,'');

  //Extract the query strings  as an object
  const queryStringsObject = parsedUrl.query;

  //Extract the method
  const method = req.method;

  //Extract the header
  const headers = req.headers;

  //Extract the payload
  const decoder = new StringDecoder('utf8');
  let buffer='';
  req.on('data',(data)=>{
    buffer+=decoder.write(data);
  });

  req.on('end',()=>{
    buffer+=decoder.end();

    const chosenHandler = router[trimmedPath] || handlers.notFound;
    
    const data = {
      trimmedPath,
      queryStringsObject,
      method,
      headers,
      payload: !buffer || helpers.getJsonParsedToObject(buffer),
    };

    chosenHandler(data, (statusCode, payload)=>{
      //Get the statusCode and payload
      statusCode = statusCode || 200;
      payload = payload || {};

      //Respond to the request
      res.setHeader('Content-Type','application/json')
      res.writeHead(statusCode);
      res.end(JSON.stringify(payload));

      //Log the response payload
      console.log(`Returning response with payload `, statusCode, payload);
    })
  });
}

//Routers
const router = {
  sample : handlers.sample,
  users : handlers.users,
  tokens : handlers.tokens,
  checks : handlers.checks,
}
