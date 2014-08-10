#!/usr/bin/env node

/* 
 * Example inspecting and printing a DeployR `/r/repository/script/execute` 
 * response using the `.get(key)` helper for easy response property lookup.
 *
 * Usage: $ node response.js
 */
var util        = require('util'),
    deployr     = require('../deployr'),
    config      = require('./config'),
    credentials = config.credentials;

/*
 * stdout helper to print a string representation of object for the example.
 */
var printf = function(obj) {
	console.log('========================');
	console.log(obj.property || 'Response');
	console.log('========================');
	console.log(util.inspect(obj.value || obj, false, null, true));	
	console.log('\n\n');
};

deployr.configure({ host: config.deployrEndpoint })
  .io('/r/repository/script/execute')	
  .data({ filename : 'DeployR - Hello World', author: 'testuser' })
  .numeric('input_randomNum', 10)  
  .end(function(res) {
  	printf(res);
	printf(res.get('call'));
	printf(res.get('success'));
	printf(res.get('console'));
  });