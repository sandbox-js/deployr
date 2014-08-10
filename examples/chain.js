#!/usr/bin/env node

var deployr     = require('../deployr'),
    config      = require('./config'),
    credentials = config.credentials;

/* 
 * Runs a DeployR request chain in sequence but asynchronous:
 * --------------------------------------------------------------------
 * 0. configure request to DeployR server `http://184.106.156.164:7200`
 * 1. /r/user/login
 * 2. /r/repository/script/execute
 * 3. /r/project/create
 * 4. /r/project/execute/script
 * 5. /r/project/close
 * 6. /r/user/logout
 * -------------------------------------------------------------------- 
 * @NOTE - If error occures somewhere in the call chain it is aborted.
 */

deployr.configure( { logging: true, host: config.deployrEndpoint })
// ====================================================================
.io('/r/user/login')
.data({ username: credentials.username , password: credentials.password })
.error(function(err) {
	// do something with the error
})
.end(function(res, chain) {
	// do something with the success response
})
// ====================================================================
.io('/r/repository/script/execute')	
.data({ filename : 'DeployR - Hello World', author: 'testuser' })
.numeric('input_randomNum', 10)
.error(function(err) {
	// do something with the error
})
.end(function(res, chain) {
	// do something with the success response
})
// ====================================================================
.io('/r/project/create')
.error(function(err) {
	// do something with the error
})
.end(function(res, chain) {
	// attach project from `/r/project/create` on this io() call [2]
	return { project: res.deployr.response.project.project };
})
// ====================================================================
.io('/r/project/execute/script')
.data({ filename : 'DeployR - Hello World', author: 'testuser' })
.numeric('input_randomNum', 10)
.error(function(err) {
	// do something with the error
})
.end(function(res, chain) {	
	// attach project from `/r/project/create` on this io() call [2]
	return { project: chain[2].deployr.response.project.project };
})
// ====================================================================
.io('/r/project/close')
.end(function(res, chain) {
	// do something with the success response
})
// ====================================================================
.io('/r/user/logout')
.end(function(res, chain) {
	// do something with the success response	
});
// ====================================================================
