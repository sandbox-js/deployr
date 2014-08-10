#!/usr/bin/env node

var path        = require('path'),
    deployr     = require('../deployr'),
    config      = require('./config'),
    credentials = config.credentials;

/* 
 * Simnple file upload using `.attach(/path/to/file)` 
 */
deployr.configure( { host: config.deployrEndpoint })
  .io('/r/user/login')
  .data({ username: credentials.username , password: credentials.password })
  .end()
  .io('/r/repository/file/upload')
  .data({ filename: 'TestUpload.R', descr: 'Sample R script upload' })    
  .attach(path.join(__dirname, 'satscores.csv'))
  .error(function(err) {
     console.log(error);
  })
  .end(function(res, chain) {
    console.log(res);
  });