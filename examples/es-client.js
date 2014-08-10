#!/usr/bin/env node

var deployr = require('../deployr'),
    config  = require('./config'),
    util    = require('util'),
    app     = require('express')();

/*
 * stdout helper to print a string representation of object for the example.
 */
var printf = function(obj) {
	console.log(util.inspect(obj, false, null, true));	
	console.log('\n\n');
};


deployr.configure( { logging: false, cors: true, host: config.deployrEndpoint });

//var es = deployr.es({ username: 'admin', password: 'secret' })
var es = deployr.es({ username: 'testuser', password: 'secret' })
  //.all()
  .session() // default
  //.project(id)
  //.job(id)
  //.management() 

  .on('es:error', function(data) {
  	console.log('===================');
  	console.log('es:error');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:connecting', function(data) {
  	console.log('===================');
  	console.log('es:connecting');
  	console.log('===================');  	  	
  	printf(data);
  })
  /*.on('es:open', function(data) {
  	console.log('===================');
  	console.log('es:open');
  	console.log('===================');
  	printf(data);
  })*/ 
  .on('es:disconnect', function(data) {        
  	console.log('===================');
  	console.log('es:disconnect');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:streamConnect', function(data) {
  	console.log('===================');
  	console.log('es:streamConnect');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:streamDisconnect', function(data) { // ???????????
  	console.log('===================');
  	console.log('es:streamDisconnect');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:executionConsole', function(data) {
  	console.log('===================');
  	console.log('es:executionConsole');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:executionRevo', function(data) {
  	console.log('===================');
  	console.log('es:executionRevo');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:executionError', function(data) {
  	console.log('===================');
  	console.log('es:executionError');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:jobLifecycle', function(data) {
  	console.log('===================');
  	console.log('es:jobLifecycle');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:gridHeartbeat', function(data) {
  	console.log('===================');
  	console.log('es:gridHeartbeat');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:gridActivity', function(data) {
  	console.log('===================');
  	console.log('es:gridHeartbeat');
  	console.log('===================');  	  	
  	printf(data);
  })
  .on('es:gridWarning', function(data) {
  	console.log('===================');
  	console.log('es:gridWarning');
  	console.log('===================');  	  	
  	printf(data);  	
  })
  .on('es:securityLogin', function(data) {     
  	console.log('===================');
  	console.log('es:securityLogin');
  	console.log('===================');  	       
  	printf(data);
  })
  .on('es:securityLogout', function(data) {
  	console.log('===================');
  	console.log('es:securityLogout');
  	console.log('===================');  	       
  	printf(data);
  })
  .open();




/*
setTimeout(function() {
	es.close();
}, 3000);
app.listen(3000);
*/





