module.exports = function (classes){
  'use strict';

  /*
   JSON-RPC 2.0 Specification Errors codes by dcharbonnier 
   */
  var Errors = {};

  Errors.AbstractError = classes.ES5Class.$define('AbstractError', {
    construct: function(message){
      this.name = this.$class.$className;
      this.message = message || this.$class.$className;
      Error.captureStackTrace(this, this.$class);
    }
  }).$implement(Error, true);

  Errors.ParseError = Errors.AbstractError.$define('ParseError', {
    construct: function(message) {
      this.$super(message);
      this.code = -32700;
    }
  });

  Errors.InvalidRequest = Errors.AbstractError.$define('InvalidRequest', {
    construct: function(message){
      this.$super(message);
      this.code = -32600;
    }
  });

  Errors.MethodNotFound = Errors.AbstractError.$define('MethodNotFound', {
    construct: function(message) {
      this.$super(message);
      this.code = -32601;
    }
  });

  Errors.InvalidParams = Errors.AbstractError.$define('InvalidParams', {
    construct: function(message) {
      this.$super(message);
      this.code = -32602;
    }
  });

  Errors.InternalError = Errors.AbstractError.$define('InternalError', {
    construct: function(message) {
      this.$super(message);
      this.code = -32603;
    }
  });

  Errors.ServerError = Errors.AbstractError.$define('ServerError', {
    construct: function(message) {
      this.$super(message);
      this.code = -32000;
    }
  });

  return Errors;
};