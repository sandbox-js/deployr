#!/usr/bin/env node

var deployr     = require('../deployr'),
    config      = require('./config'),
    credentials = config.credentials;

/* 
 * Runs a DeployR basic auth using the `.entity('user')` helper method to 
 * filter-out and return only the Top Level `user` entity from the response.
 */

deployr.configure( { logging: false, host: config.deployrEndpoint })
  .io('/r/user/login')
  .data({ username: credentials.username , password: credentials.password })
  .entity('user')
  .end(function(res, chain) {
  	console.log(res);
  })
  .ensure(function() {
  	console.log('cleanup...'); 
  	deployr.io('/r/user/logout').end();	
  });