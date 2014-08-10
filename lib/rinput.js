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

var Base   = require('./selfish').Base;     
    RTypes = require('./rtypes');

module.exports = Base.extend(RTypes, {
	initialize: function initialize(name, value, options) {  	
		this.name  = name;
		this.value = value;
		this.options = options || {};
	},

	numeric: function numeric() {
		return this.assert({
			type: this.deployr.RNUMERIC,
			name: this.name, 
			value: this.value 
		});
	},	

	integer: function integer() {
		return this.assert({ 
			type: this.deployr.RINTEGER,
			name: this.name, 
			value: this.value
		}); 
	},
	
	logical: function logical() {
		return this.assert({ 
			type: this.deployr.RBOOLEAN, 
			name: this.name, 
			value: this.value
		}); 
	},
	
	character: function character() {
		return this.assert({ 
			type: this.deployr.RSTRING, 
			name: this.name, 
			value: this.value
		}); 
	},
	
	date: function date() {
		return this.assert({ 
			type: this.deployr.RDATE,
			name: this.name, 
			value: this.value,
			format: 'yyyy-MM-dd'
		}); 
	},

	posixct: function posixct() {
		return this.assert({ 
			type: this.deployr.RPOSIX_DATE, 
			name: this.name, 
			value: this.value,
			format: 'yyyy-MM-dd HH:mm:ss Z'
		}); 
	},	
	
	numericVector: function numericVector() { 
		return this.assert({ 
			type: this.deployr.RNUMERIC_VECTOR,
			name: this.name, 
			value: this.value
		}); 
	},
	
	integerVector: function integerVector() {
		return this.assert({ 
			type: this.deployr.RINTEGER_VECTOR, 
			name: this.name, 
			value: this.value
		}); 
	},
	
	logicalVector: function logicalVector() { 
		return this.assert({ 
			type: this.deployr.RBOOLEAN_VECTOR, 
			name: this.name, 
			value: this.value
		}); 
	},
	
	characterVector: function characterVector() { 
		return this.assert({ 
			type: this.deployr.RSTRING_VECTOR, 
			name: this.name, 
			value: this.value
		}); 
	},  
	
	dateVector: function dateVector() { 
		return this.assert({ 
			type: this.deployr.RDATE_VECTOR, 
			name: this.name, 
			value: this.value,
			format: 'yyyy-MM-dd'
		}); 
	},	
	
	posixctVector: function posixctVector() { 
		return this.assert({ 
			type: this.deployr.RPOSIX_DATE_VECTOR, 
			name: this.name, 
			value: this.value,
			format: 'yyyy-MM-dd HH:mm:ss Z'
		}); 
	},
	
	list: function list() {
		return this.assert({ 
			type: this.deployr.RLIST, 
			name: this.name, 
			value: this.value 
		}); 
	},
	
	dataframe: function dataframe() { 
		return this.assert({ 
			type: this.deployr.RDATAFRAME, 
			name: this.name, 
			value: this.value
		}); 
	},
	
	factor: function factor() {
		var opts = this.options;

		return this.assert( { 
			type: this.deployr.RFACTOR, 
			name: this.name, 
			value: this.value,
			ordered: opts.ordered,
			levels: opts.levels,
			labels: opts.labels
		}); 
	},

	numericMatrix: function numericMatrix() { 
		return this.assert({ 
			type: this.deployr.RNUMERIC_MATRIX, 
			name: this.name, 
			value: this.value
		}); 
	},

	integerMatrix: function integerMatrix () { 
		return this.assert({ 
			type: this.deployr.RINTEGER_MATRIX, 
			name: this.name, 
			value: this.value
		}); 
	},

	logicalMatrix: function logicalMatrix () { 
		return this.assert({ 
			type: this.deployr.RBOOLEAN_MATRIX, 
			name: this.name, 
			value: this.value
		}); 
	},

	characterMatrix: function characterMatrix () {
		return this.assert({ 
			type: this.deployr.RSTRING_MATRIX, 
			name: this.name, 
			value: this.value
		}); 
	}
});