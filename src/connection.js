'use strict';

var Connection = EventEmitter.define('Connection', {
  construct: function (ep){
    this.$super();

    this.endpoint = ep;
    this.callbacks = {};
    this.latestId = 0;

    // Default error handler (prevents ''uncaught error event'')
    this.on('error', function (){
    });
  },
  /**
   * Make a standard RPC call to the other endpoint.
   *
   * Note that some ways to make RPC calls bypass this method, for example HTTP
   * calls and responses are done in other places.
   */
  call     : function(method, params, callback){
    if (!_.isArray(params)) {
      params = [params];
    }

    var id = null;
    if (_.isFunction(callback)) {
      id = ++this.latestId;
      this.callbacks[id] = callback;
    }

    Endpoint.trace('-->', 'Connection call (method ' + method + '): ' + JSON.stringify(params));
    var data = JSON.stringify({
      jsonrpc: '2.0',
      method : method,
      params : params,
      id     : id
    });
    this.write(data);
  },

  /**
   * Dummy method for sending data.
   *
   * Connection types that support sending additional data will override this
   * method.
   */
  write: function(){
    throw new Error('Tried to write data on unsupported connection type.');
  },

  /**
   * Keep the connection open.
   *
   * This method is used to tell a HttpServerConnection to stay open. In order
   * to keep it compatible with other connection types, we add it here and make
   * it register a connection end handler.
   */
  stream: function (onend){
    if (_.isFunction(onend)) {
      this.on('end', onend);
    }
  },

  handleMessage: function(msg){
    var self = this;

    if (msg) {
      if (
          (msg.hasOwnProperty('result') || msg.hasOwnProperty('error')) &&
          msg.hasOwnProperty('id') && _.isFunction(this.callbacks[msg.id])
        ) {
        // Are we in the client?
        try {
          this.callbacks[msg.id](msg.error, msg.result);
          delete this.callbacks[msg.id];
        } catch (err) {
          // TODO: What do we do with erroneous callbacks?
        }
      } else if (msg.hasOwnProperty('method')) {
        // Are we in the server?
        this.endpoint.handleCall(msg, this, (function (err, result){
          if (err) {
            if (self.listeners('error').length) {
              self.emit('error', err);
            }
            Endpoint.trace('-->',
              'Failure ' + (Endpoint.hasId(msg) ? '(id ' + msg.id + ')': '') + ': ' +
              (err.stack ? err.stack : err.toString())
            );
          }

          // Return if it's just a notification (no id)
          if (!Endpoint.hasId(msg)) {
            return;
          }

          if (err) {
            err = err.toString();
            result = null;
          } else {
            Endpoint.trace('-->', 'Response (id ' + msg.id + '): ' +
              JSON.stringify(result));
            err = null;
          }

          this.sendReply(err, result, msg.id);
        }).bind(this));
      }
    }
  },

  sendReply: function(err, result, id){
    var data = JSON.stringify({
      jsonrpc: '2.0',
      result : result,
      error  : err,
      id     : id
    });

    this.write(data);
  }
});

module.exports = Connection;
