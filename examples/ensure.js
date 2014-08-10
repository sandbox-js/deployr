#!/usr/bin/env node

var deployr     = require('../deployr'),
    config      = require('./config'),
    credentials = config.credentials;

/* 
 * Simple promise chaining using `.ensure()` and `.then()` base on the 
 * Promises/A+ specs. 
 */
deployr.configure( { host: config.deployrEndpoint })
  .io('/r/user/login')
  .data({ username: credentials.username , password: credentials.password })
  .end()
  .ensure(function() {
  	console.log('finally cleanup...'); 
  	deployr.io('/r/user/logout').end();	
  })
  .then(function(res) {
    console.log('then this.');
    return res; // pass result to the next `.then()`
  }, function(err) {
    console.log(err);
  })
  .then(function(res) {
    console.log('after that then this.');
    return res; // pass result to the next `.then()`
  })
  .then(function(res) {
    console.log('after that then we are done.');
    console.log(res);
  });
