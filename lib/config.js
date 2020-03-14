const environments = {
  "staging":{
    "httpPort":3000,
    "httpsPort":3001,
    "envName":"staging",
    "hashSecret" : "IAmAHashSecret",
    "maxChecks":5,
  },
  "production":{
    "httpPort":5000,
    "httpsPort":5001,
    "envName":"production",
    "hashSecret" : "IAmAHashSecret",
    "maxChecks":5,
  }
};

const currentEnvironment = process.env.NODE_ENV || "staging";

module.exports = environments[currentEnvironment];
