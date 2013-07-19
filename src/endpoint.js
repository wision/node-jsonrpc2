'use strict';

var debug = require('debug')('jsonrpc');

/**
 * Abstract base class for RPC endpoints.
 *
 * Has the ability to register RPC events and expose RPC methods.
 */
var Endpoint = EventEmitter.define('Endpoint', {
  construct : function (){
    this.functions = {};
    this.scopes = {};
    this.defaultScope = this;
    this.exposeModule = this.expose;
    this.$super();
  },
  /**
   * Define a callable method on this RPC endpoint
   */
  expose    : function (name, func, scope){
    if (_.isFunction(func)) {
      Endpoint.trace('***', 'exposing: ' + name);
      this.functions[name] = func;

      if (scope) {
        this.scopes[name] = scope;
      }
    } else {
      var funcs = [];

      for (var funcName in func) {
        if (Object.prototype.hasOwnProperty.call(func, funcName)) {
          var funcObj = func[funcName];
          if (_.isFunction(funcObj)) {
            this.functions[name + '.' + funcName] = funcObj;
            funcs.push(funcName);

            if (scope) {
              this.scopes[name + '.' + funcName] = scope;
            }
          }
        }
      }

      Endpoint.trace('***', 'exposing module: ' + name + ' [funs: ' + funcs.join(', ') + ']');
    }
    return func;
  },
  handleCall: function(decoded, conn, callback){
    Endpoint.trace('<--', 'Request (id ' + decoded.id + '): ' +
      decoded.method + '(' + decoded.params.join(', ') + ')');

    if (!this.functions.hasOwnProperty(decoded.method)) {
      callback(new Error('Unknown RPC call "' + decoded.method + '"'));
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
  }
}, {
  /**
   * Output a piece of debug information.
   */
  trace: function (direction, message){
    debug('   ' + direction + '   ' + message);
  },
  /**
   * Check if current request has an id
   * @param {Object} request
   * @return {Boolean}
   */
  hasId: function(request){
    return request && typeof request['id'] !== 'undefined' && /^\-?\d+$/.test(request['id']);
  }
});

module.exports = Endpoint;
