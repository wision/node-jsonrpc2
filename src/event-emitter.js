module.exports = function (classes){
  'use strict';

  var debug = require('debug')('jsonrpc');

  var EventEmitter = classes.ES5Class.define('EventEmitter', {}, {
    /**
     * Output a piece of debug information.
     */
    trace : function (direction, message){
      var msg = '   ' + direction + '   ' + message;
      debug(msg);
      return msg;
    },
    /**
     * Check if current request has an integer id
     * @param {Object} request
     * @return {Boolean}
     */
    hasId : function (request){
      return request && typeof request['id'] !== 'undefined' && /^\-?\d+$/.test(request['id']);
    },
    errors: {
      '-32700': 'Parse error',
      '-32600': 'Invalid Request',
      '-32601': 'Method not found',
      '-32602': 'Invalid params',
      '-32603': 'Internal error'
    }
  }).implement(require('events').EventEmitter, true);

  return EventEmitter;
};

