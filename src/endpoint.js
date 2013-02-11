var debug = require('debug')('jsonrpc');
var util = require('util');
var events = require('events');


/**
 * Abstract base class for RPC endpoints.
 *
 * Has the ability to register RPC events and expose RPC methods.
 */
var Endpoint = function () {
	events.EventEmitter.call(this);

	this.functions = {};
	this.scopes = {};
	this.defaultScope = this;
};
util.inherits(Endpoint, events.EventEmitter);

/**
 * Output a piece of debug information.
 */
Endpoint.trace = function (direction, message) {
	debug('   ' + direction + '   ' + message);
}

/**
 * Define a callable method on this RPC endpoint
 */
Endpoint.prototype.expose = function (name, func, scope) {
	if ("function" === typeof func) {
		Endpoint.trace('***', 'exposing: ' + name);
		this.functions[name] = func;

		if (scope) {
			this.scopes[name] = scope;
		}
	} else {
		var funcs = [];
		var object = func;
		for (var funcName in object) {
			var funcObj = object[funcName];
			if (typeof(funcObj) == 'function') {
				this.functions[name + '.' + funcName] = funcObj;
				funcs.push(funcName);

				if (scope) {
					this.scopes[name + '.' + funcName] = scope;
				}
			}
		}
		Endpoint.trace('***', 'exposing module: ' + name +
			' [funs: ' + funcs.join(', ') + ']');
		return object;
	}
}

/**
 * Handle a call to one of the endpoint's methods.
 */
Endpoint.prototype.handleCall = function handleCall(decoded, conn, callback) {
	Endpoint.trace('<--', 'Request (id ' + decoded.id + '): ' +
		decoded.method + '(' + decoded.params.join(', ') + ')');

	if (!this.functions.hasOwnProperty(decoded.method)) {
		callback(new Error("Unknown RPC call '" + decoded.method + "'"));
		return;
	}

	var method = this.functions[decoded.method];
	var scope = this.scopes[decoded.method] || this.defaultScope;

	// Try to call the method, but intercept errors and call our
	// error handler.
	try {
		method.call(scope, decoded.params, conn, callback);
	} catch (err) {
		callback(err);
	}
};

Endpoint.prototype.exposeModule = Endpoint.prototype.expose;

module.exports = Endpoint
