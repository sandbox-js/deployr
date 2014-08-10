
var JSONStream = require('JSONStream'),
    deployr    = require('../deployr'),
    config     = require('./config');

deployr.configure({ host: config.deployrEndpoint })

deployr.script('/testuser/root/DeployR - Hello World.R')
  .numeric('input_randomNum', 10)
  .pipe(JSONStream.parse('deployr.response.execution.artifacts.*.url'))  
  .pipe(JSONStream.stringify(false))
  .pipe(process.stdout);