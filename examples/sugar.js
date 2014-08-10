#!/usr/bin/env node


/* 
 * Make DeployR "sweeter" for human use...
 *
 * Example inspecting and printing a DeployR `/r/repository/script/execute` 
 * response using the `.get(key)` helper for easy response property lookup.
 *
 * Usage: $ node sugar.js
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


// ============================================================================
// Set the DeployR server endpoint URL
// ============================================================================
deployr.configure({ host: config.deployrEndpoint, logging: false });

// ============================================================================
// Executes repository-managed scripts on an Anonymous Project.
// @NOTE:
// 
// `.script( { project: true } ...)` will implicitly create a temporary project
//   and use it for the script execution
// ============================================================================

//deployr.script({ filename: 'DeployR - Hello World', author: 'testuser'})
//deployr.script('DeployR - Hello World.R', 'testuser', 'root')
//deployr.script('/testuser/root/DeployR - Hello World.R', true)

deployr.script('/testuser/root/DeployR - Hello World.R')
   .numeric('input_randomNum', 10)  
   .end(function(res) {
     printf(res.get('console'));
   });

// ============================================================================
// Executes repository-managed scripts on the R session.
// @NOTE:
// 
// `.script( { project: true } ...)` will implicitly create a temporary project
//   and use it for the script execution
// ============================================================================

var project = null; // project-id used to close project at the end

deployr.auth(credentials.username, credentials.password)  
   .script('/testuser/root/DeployR - Hello World.R', true)
   //.script({ project: true, filename: 'DeployR - Hello World', author: 'testuser'})
   .numeric('input_randomNum', 10)   
   .end(function(res) { 
   	 project = res.get('project').value; // save project so we can close later

   	 // stdout
     printf(res.get('console'));     
     printf(res.get('artifacts'));     
   })   
   .ensure(function() {
   	  // close all projects and log out
   	  deployr.shutdown(project);
   });