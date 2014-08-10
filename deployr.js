/*!
 * Copyright (C) 2010-2014 by Revolution Analytics Inc.
 *
 * This program is licensed to you under the terms of Version 2.0 of the
 * Apache License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) for more 
 * details.
 */

var win       = (typeof window !== 'undefined'),
    optional  = require('./lib/optional'),
    WS        = optional('ws'),    
    request   = require('superagent'),
    D         = require('d.js'),
    fs        = require('fs'),
    apis      = require('./apis.json'), 
    utils     = require('./lib/utils'),
    Lang      = require('./lib/lang'),   
    Logger    = require('./lib/logger'),   
    Queue     = require('./lib/queue'),
    Emitter   = require('./lib/emitter'),
    encoder   = require('./lib/encoder'),
    Base      = require('./lib/selfish').Base,
    RInput    = require('./lib/rinput'),    
    RInputs   = require('./lib/rinputs'),
    merge     = utils.merge,
    cookie    = null;

/**
 * Global options the persist through all DeployR requests.
 */
var globalOptions = { 
  cors: false,
  logging: false,
  host: '',
  maxRequests: null, // no socket pooling in http.Agent
  events:{}
};

/**
 * The top-level DeployR API response entities.
 */
var TOPLEVEL_ENTITIES = [
  'user', 
  'project', 
  'workspace', 
  'execution', 
  'directory', 
  'repository', 
  'packages' 
];

function raiseGlobalErrors(api, res) {
  var code = res.deployr ? res.deployr.response.errorCode : res.status,
      context = this;

  // -- global events if provided --
  if (globalOptions.events) {
    if (!res.deployr) {
      res = res.text;
    }

    context = globalOptions.events.ctx || context;

    // -- genral global failure --
    if (globalOptions.events.error) {
      globalOptions.events.error.apply(context, [api, res]);
    }

    // -- HTTP or DeployR global errors --    
    if (globalOptions.events[code]) {
      globalOptions.events[code].apply(context, [api, res]);
    }
  }
}

/**
 * Initialize a new `DeployR` with the given `api`.
 *
 * @param {String} api
 * @param {String} link (optional)
 * @api private
 */

var DeployR = Base.extend(Emitter.prototype, RInputs, { 

  initialize: function initialize(api, link) {
     Emitter.call(this); 
  
     var opts = globalOptions;

     if (!apis[api]) { throw new Error('Invalid API "' + api + '"'); }

     this.scope    = this;
     this.api      = merge({ 'call': api }, apis[api]);    
     this.link     = link || {};
     this.q        = this.link.queue || new Queue();
     this.deferred = this.link.deferred || D();
     this.logger   = Logger.get(api, Logger.OFF); // transaction-level logging
     this.params   = {};
     this.inputs   = []; // rinputs list 
     this.outputs  = []; // routput object list
     this._stream  = false;
     this.delayed  = false;
     this.file     = null; 
     this.filter   = null; 

     // preset deployr's assigned response format for `this` api
     this.data({ format: this.api.format });

     // wrap superagent for the heavly lifting 
     this.req = 
        request[this.api.method.toLowerCase()](opts.host + '/deployr' + api);
     this.req.timeout(20 * 60 * 1000); // default timeout --> 20 minutes
  
     // All CORS deployr calls require sticky sessions
     if (win && globalOptions.cors) { this.req.withCredentials(); }

     if (this.api.upload) {
       // If the env is the Browser there is no need to manually set the
       // Content-Type. The browser will automatically set the 
       // "multipart/form-data; boundary=..." value. If the env is Node we need
       // to set it manually.
       if (!win) { this.req.type('multipart/form-data'); }    
     } else {
      this.req.type('form');
    } 
  },

  ctx: function (ctx) {
    this.scope = ctx || this;

    return this;
  },

  abort: function abort() {
    this.req.abort();
    this.emit('abort');

    return this;
  },

  timeout: function timeout(ms) {
    this.req.timeout(ms);

    return this;
  },

  sync: function sync() {
    return this;
  },

  delay: function delay(ms) {
    this.delayed = !isNaN(parseFloat(ms)) && isFinite(ms) ? ms : true;

    return this;
  },

  // unwind the queue chain clearing requests that might have delays attached
  drain: function drain() {
    this.delayed = false;
    this.q.flush(); 

    return this.deferred.promise;
  },

  log: function log(level) {
    this.logger.setLevel(level || Logger.DEBUG);

    return this;
  },

  entity: function (entity) {
    this.filter = utils.inArray(TOPLEVEL_ENTITIES, entity);

    return this;
  },

  data: function (data) {
    data = data || {};

    // remove any inlined rinput(s) and attach them to the rinput(s) property
    if (data.rinput || data.rinputs) {
      this.rinput(data.rinput);
      this.rinputs(data.rinputs);
      delete data['rinput'];
      delete data['rinputs'];
    } 

    this.params = merge(this.params, data);

    return this;
  },

  attach: function attach(file, filename) {
    if (this.api.upload) {
      this.file = file;

      // optional filename here for convenience
      if (filename) { this.data( { filename: filename } ); }
    }

    return this;
  },

  stream:  function stream() {
    this._stream = (!win && this.api.upload); //nodejs only

    return this;
  },

  then: function then(onFulfilled, onRejected) {
    this.deferred.promise.then(onFulfilled, onRejected);

    return this.deferred.promise;
  },

  promise: function promise() {
    this.end();
    return this.deferred.promise;
  },

  ensure: function ensure(fn) {
    this.deferred.promise.ensure(fn);

    return this.deferred.promise; //this;
  },
      
  error: function error(fn) {
    var self = this;

    this.on('error', fn);
    this.req.on('error', function(err) { self.emit('error', err); });

    return this;
  },

  pipe: function pipe(dest) {
    // throw new Error('pipe() in progress for request "' + this.api['call'] + '"'; 
    var self = this,
        q = this.q,
        emit = this.emit;

    q.add(function(responseChain, error) {
      // brake the call chain on error
      if (error) {
        this.abort();
        this.emit('ensure');
        return;
      }

      this._prepRequest(responseChain);

      var stream = this.req.pipe(dest);
      q.yield(true);

      stream.on('error', function (err) {
        emit('error', err); 
      });    

      stream.on('end', function(res) {
        //console.log(res);
        //console.log('end');
      }); 

      stream.on('finish', function(res) {
        //console.log('finish');
        //console.log(res);
      });     

      stream.on('data', function(res) {
        //console.log(res);
        //console.log('data');
      });

      stream.on('response', function(res) {
        cookie = res.headers['set-cookie'];
        res = (res.body  && res.body.deployr ? res.body : res); 
        error = self._handleError(res);      

        self.inputs = [];
        self.outputs = [];

        q.yield(false);      
        q.flush(res, error); // pass result and error (if available) to next 

      }); // end 'response'     

    }, this);
  
    if (q.size() <= 1) { q.flush(); }

    return dest;
  },

  end: function end(fn) {
    var self   = this,
        q      = this.q,
        api    = this.api,
        args   = null,
        entity = this.filter;

    q.add(function(responseChain, error, prevArgs) {    
      // brake the call chain on error      
      if (error) {
        this.deferred.reject(error);
        this.req.abort();        
        q.flush(responseChain, error, prevArgs); // drain the queue
        this.destroy();
        return;
      }

      this._prepRequest(responseChain, prevArgs);

      Logger.info('io()', api, this.req);
      this.logger.info('io()', api, this.req);    

      this.req.end(function(res) {
        cookie = cookie || res.headers['set-cookie'];
        error = self._handleError(res);
        var dres = (res.body && res.body.deployr ? res.body : res);             
      
        self.inputs = [];
        self.outputs = [];

        if (!error) {
           // -- Log global + transaction log --
           Logger.info('end()', api, dres, res);
           self.logger.info('end()', api, dres, res);

           // -- walk response for top-level entity response assignment --        
           if (entity) { dres = dres.deployr.response[entity] || dres; }

           dres.get = function(key) { 
              return utils.get(dres.deployr.response, key); 
           };

           dres.workspace = function(name) { 
              return utils.workspace(dres.deployr.response, name); 
           };

           // -- notify that the queue has been drained... --
           if (q.size() === 0) { self.deferred.resolve(responseChain || dres); }

           // -- callback --
           if (fn) { args = fn.apply(self.scope, [dres, responseChain]);}
        }        

        q.yield(false);
        q.flush(dres, error, args); // pass result|error|args to next 
      });

      q.yield(true);
    }, this, this.delayed);
  
    if (!this.delayed && q.size() <= 1) { q.flush(); }

    return this;
  },

  destroy: function destroy() {
    this.offAll();
    this.api = null;
    this.link = null;  
    this.logger = null;  
    this.params = null;
    this.inputs = null;
    this.outputs = null;
    this.file = null;  
    this._stream = false;
    this.delayed = false;
    this.req = null;  
  },

  /** 
   * Chain async requests
   */
  io: function io(api, fn) {
    // no .end() provided and now .delay() wait provided
    /*if (!this.ending && !this.delayed) {
    throw new Error('Attempting to chain .io(' + api + ') without .end() or ' +
    ' .delay()');
    }*/
    //if (!this.ending) { this.end(); }

    return DeployR.new(api, { queue: this.q, fn: fn, deferred: this.deferred });
  },

  script: function() {
     var args = utils.signature(arguments),
         opts = args.opts,
         api  = args.api,
         link = { queue: this.q, deferred: this.deferred };                                     

    // convenience - if the project is a boolen `true` rather than a pid, first
    // create a new project and then prepare the project api call to execute
    if (opts.project && Lang.isBoolean(opts.project)) {
      delete opts['project'];

      return DeployR.new('/r/project/create', link)
               .end(function(res) {
                  return { project: res.get('project').value };
                })
               .io(api)
               .data(opts);
    } else {
      return DeployR.new(api, link).data(opts);
    }    
  },

  routputs: function (routputs) {
    this.outputs = this.outputs.concat(routputs);
    return this;
  },

  routput: function (routput) {
    this.routputs([routput]);
    return this;
  },

  rinputs: function (rinputs) {
    if (rinputs) { this.inputs = this.inputs.concat(rinputs); }

    return this;
  },

  rinput: function (rinput) {
    if (rinput) { this.inputs.push(rinput); }

    return this;
  },

  // --------------------------------------------------------------------------
  // Private methods
  // --------------------------------------------------------------------------

  /**
   * @private
   */
  _prepRequest: function _prepRequest(responseChain, args) {
    var req = this.req,
        link = this.link.fn;

    // arguments returned from prev request's io().end(function() { return x; })
    if (args) { 
       this.data(args);
    }

    if (this.inputs.length > 0) { 
      this.data({ inputs: encoder.encode(this.inputs) }); 
    }
  
    if (this.outputs.length > 0) { 
      this.data({ robjects: this.outputs.join() }); 
    }

    // linkin prev request(s) results into this request
    if (link) { 
      var prev = (responseChain ? responseChain[responseChain.length-1] : null);
      this.data(link.apply(this, [prev, responseChain]));
    } 

    if (cookie) {  
      //for (var i = 0; i < cookie; i++) { req.set('Cookie', cookie[i]); };
      cookie.forEach( function(c) { req.set('Cookie', c); });
    }

    if (this.api.upload) {    
      for(var p in this.params) { 
        this.req.field(p, this.params[p] ? this.params[p] + '' : '');  
      } 
      req.attach('file', this._stream ? fs.createReadStream(this.file) : this.file);
    } else {
      req[this.api.method === 'GET' ? 'query' : 'send'](this.params);
    } 
  },

  /**
   * @private 
   */
  _handleError: function _handleError(raw) {
    var stat = raw.status,
        res = (raw.body && raw.body.deployr ? raw.body : raw),
        error = ((stat !== 200) || res.deployr && !res.deployr.response.success);

    // -- Handle errors --
    if (error) {
      res = {
        deployr: {
          response: {
            success: false,
            call: this.api['call'],
            errorCode: res.deployr ? res.deployr.response.errorCode : stat,
            error: res.deployr ? res.deployr.response.error : res.text
          }
        }
      };

      Logger.error('error()', this.api, res, raw);
      this.logger.error('error()', this.api, res, raw);

      // -- notify global errors first (if any) for this call --
      raiseGlobalErrors(this.api['call'], res);        

      // -- tranaction level HTTP or DeployR errors come next --    
      this.emit('error', res);
      this.emit('deployr-io:' + res.deployr.response.errorCode, res);
      this.deferred.reject(res);
    }

    return error;
  }
});

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function EventStream(options) {
  Emitter.call(this); 

  this.options = options || {};
  this.options.log = this.options.log || EventStream.LOG.error;
  this.ws = null;
  this.q = new Queue();
  this.channel = {};

  console.log('ES cont');
}

/**
 * The log level. Value allowed are 'info', 'debug' and 'error'.
 */
EventStream.LOG = { 
  info: 'info', 
  debug: 'debug', 
  error: 'error' 
};
  
EventStream.parser = {
    EVENT: 'messageReceived', // generic event
    CONNECT: 'streamHandshakeEvent',
    CONNECTING: 'opening',
    DISCONNECT: 'unsubscribe',
    ERROR: 'error'
};

EventStream.prototype.open = function(options) {
  var self = this;

  var uri = (globalOptions.host || '') + '/deployr/r/event/stream?',
      params = [];

  options = this.channel;   

  // -- append option parameters --
  if (options.project) {
    params.push('project=' + options.project);
  } else {
    if (options.job) {
      params.push('job=' + options.job);
    }
  }

  if (options.management) {
    params.push('managementEventOnly=true');
  } else {
    if (options.httponly) {
      params.push('httpEventOnly=true');
    } else {
      if (options.revoonly) {
        params.push('revoEventOnly=true');
      }
    }
  }

  uri += params.join('&').substr(0);
  uri = uri.replace('http://', 'ws://');

  this.q.yield(true);
  this.q.add(function() {

    this.emit('es:connecting', { 
      uri: uri, 
      headers: cookie ? { 'Cookie': cookie } : {}
    });

    var ws = new WS(uri, cookie ? { headers: { 'Cookie': cookie }} : {});

    ws.onopen = function (message) {
      //self.emit('es:open', message);
    };

    ws.onmessage = function (message) {
      try {
        /*console.log('~~~~~~~~~~~~~~~~~~~~~');
        console.log(message);
        console.log('~~~~~~~~~~~~~~~~~~~~~');*/
        message = JSON.parse(message.data.split('!|!')[1]);
        var type = message.deployr.response.event.type;
        self.emit('es:' + type.replace('Event', ''), message);
      } catch (e) {
        //console.log('This doesn\'t look like a valid JSON: ', message.data);
      } 
    };

    ws.onerror = function (err) { self.emit('es:error', err); };
    ws.onclose = function (message) { self.emit('es:disconnect', message); };

    this.ws = ws;
  }, this);

  return this;    
};

EventStream.prototype.close = function() {
  if (this.ws) { this.ws.close(); }
  return this;
};

EventStream.prototype.error = function(fn) {
  this.on('es:error', fn);
  return this;
};  

EventStream.prototype.all = function() {
  this.channel = { revoonly: true };  // revoEventOnly=true
  return this;
};

EventStream.prototype.session = function() {
  this.channel = { httonly: true }; //httpEventOnly=true
  return this;
};

EventStream.prototype.project = function(project) {
  this.channel = { project: project }; // project=12345
  return this;
};

EventStream.prototype.job = function(job) {
  this.channel = { job: job }; //job=12345
  return this;
};

EventStream.prototype.management = function() {
  this.channel = { management: true }; //managementEventOnly=true
  return this;
};

EventStream.prototype.flush = function() {
  this.q.yield(false);
  this.q.flush();
};
  
/**
 * Mixin `Emitter`.
 */
Emitter(EventStream.prototype);

// Include the `deprecated` jsDeployR for now.
if (win) {
  window.Revolution = window.Revolution || require('./lib/deprecated');
}

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

/**
 * Expose for a cleaner client api into DeployR
 */
module.exports = {

  configure: function(options) {
    options = options || {};

    for (var i in options) { globalOptions[i] = options[i]; }    

    // turn global logging on|off (off by default)
    Logger.setLevel(globalOptions.logging ? Logger.DEBUG : Logger.OFF);

    return this;
  },

  io: function(api) {  
    return DeployR.new(api);
  },

  auth: function(un, pw) {
    var data = { username: un, password: pw };
    return DeployR.new('/r/user/login').data(data).end();    
  },

  /**
   * deployr.script({ filename: 'DeployR - Hello World.R', author: 'testuser'})
   * deployr.script('DeployR - Hello World.R', 'testuser', 'root')
   * deployr.script('/testuser/root/DeployR - Hello World.R', project)
   * deployr.script('/testuser/root/DeployR - Hello World.R')
   */
  script: function() {
    var args = utils.signature(arguments),
        opts = args.opts,
        api  = args.api;  

    // convenience - if the project is a boolen `true` rather than a pid, first
    // create a new project and then prepare the project api call to execute
    if (opts.project && Lang.isBoolean(opts.project)) {
      delete opts['project'];

      return DeployR.new('/r/project/create')
               .end(function(res) {
                  return { project: res.get('project').value };
                })
               .io(api)
               .data(opts);
    } else {
      return DeployR.new(api).data(opts);
    }
  },

  shutdown: function(projects, auth) {
     projects = Lang.isArray(projects) ? projects : [projects];

     var defered = deferred = D(),
         last    = projects.length - 1;

    function release(index) {
      if (index === last) {
        if (!auth) {
          DeployR.new('/r/user/logout')
          .error(function(err) {          
            defered.reject(false);
          })      
          .end(function(res) { 
            defered.resolve(true);
          }); 
        } else {
          defered.resolve(true);
        }
      } 
    }
   
    projects.forEach(function(project, index) {
      DeployR.new('/r/project/close')
        .data({ project: project })          
        .error(function(err) {
          release(index);
        })
        .end(function(res) {
          release(index);
        });
    });   

    return defered.promise;  
  },

  pipeline: function(chains) {      
    var deferred = D(),
        q        = new Queue(),
        results  = [],
        errors   = [],
        NOOP     = null; // NOOP errors|results for [a] batch request chain

    // make a copy
    chains = chains.slice(0);

    function add() {
      q.add(function() { 
        chains.shift().drain()
        .then(function(chain) {  
          results.push(chain);  
          errors.push(NOOP);           
          if (q.isEmpty()) { 
            deferred.resolve({ results: results, errors: errors }); 
          }  

          q.take();
        }, function(err) {
          results.push(NOOP); 
          errors.push(err);
          // rejections are only met when they [all] fail
          if (q.isEmpty() && results.length === 0) { deferred.reject(errors); }  
          q.take();
        });       
      }, null, true);
    }

    // convert to a seq queue for better handling
    for(var i = 0; i < chains.length; i++) { add(); }

    // start: dequeue first item and run it
    q.take();

    return deferred.promise;
  },

  es: function(options) {    
    var stream = new EventStream(options);

    if (options && options.username && options.password) {
      this.auth(options.username, options.password)
        .ensure(function() {
          console.log('finally');
          stream.flush();
        });        
    }

    return stream;
  },

  RInput: {
    numeric: function (name, value) {
      return RInput.new(name, value).numeric();
    },

    integer: function (name, value) {
      return RInput.new(name, value).integer();
    },

    logical: function (name, value) {
      return RInput.new(name, value).logical();
    },

    character: function (name, value) {
      return RInput.new(name, value).character();
    },

    date: function (name, value) {
      return RInput.new(name, value).date();
    },

    posixct: function (name, value) {
      return RInput.new(name, value).posixct();
    },  

    numericVector: function(name, value) {
      return RInput.new(name, value).numericVector();
    }, 

    integerVector: function (name, value) {
      return RInput.new(name, value).integerVector();
    },

    logicalVector: function (name, value) { 
      return RInput.new(name, value).logicalVector();
    },

    characterVector: function (name, value) { 
      return RInput.new(name, value).characterVector();
    },  

    dateVector: function (name, value) { 
      return RInput.new(name, value).dateVector();
    },  

    posixctVector: function (name, value) { 
      return RInput.new(name, value).posixctVector();
    },

    list: function (name, value) {
      return RInput.new(name, value).list(); 
    },

    dataframe: function (name, value) { 
      return RInput.new(name, value).dataframe();
    },
  
    factor: function (name, value, ordered, levels, labels) {
      var opts = { ordered: ordered, levels: levels, labels: labels };
      return RInput.new(name, value, opts).factor();
    },

    numericMatrix: function (name, value) { 
      return RInput.new(name, value).numericMatrix();
    },

    integerMatrix: function (name, value) { 
      return RInput.new(name, value).integerMatrix();
    },

    logicalMatrix: function (name, value) { 
      return RInput.new(name, value).logicalMatrix();
    },

    characterMatrix: function (name, value) {
      return RInput.new(name, value).characterMatrix();
    }
  }
};