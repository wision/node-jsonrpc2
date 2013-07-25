'use strict';

var
  net = require('net'),
  http = require('http'),
  JsonParser = require('jsonparse'),
  events = require('events'),
  SocketConnection = require('./socket-connection.js');

/**
 * JSON-RPC Client.
 */
var Client = Endpoint.define('Client', {
  construct    : function (port, host, user, password){
    this.$super();

    this.port = port;
    this.host = host;
    this.user = user;
    this.password = password;
  },
  /**
   * Make HTTP connection/request.
   *
   * In HTTP mode, we get to submit exactly one message and receive up to n
   * messages.
   */
  connectHttp  : function(method, params, opts, callback){
    if (_.isFunction(opts)) {
      callback = opts;
      opts = {};
    }
    opts = opts || {};

    var id = 1;

    // First we encode the request into JSON
    var requestJSON = JSON.stringify({
      'id'     : id,
      'method' : method,
      'params' : params,
      'jsonrpc': '2.0'
    });

    var headers = {};

    if (this.user && this.password) {
      var buff = new Buffer(this.user + ':' + this.password).toString('base64');
      var auth = 'Basic ' + buff;
      headers['Authorization'] = auth;
    }

    // Then we build some basic headers.
    headers['Host'] = this.host;
    headers['Content-Length'] = Buffer.byteLength(requestJSON, 'utf8');

    // Now we'll make a request to the server
    var options = {
      hostname: this.host,
      port    : this.port,
      path    : opts.path || '/',
      method  : 'POST',
      headers : headers
    };
    var request = http.request(options);

    // Report errors from the http client. This also prevents crashes since
    // an exception is thrown if we don't handle this event.
    request.on('error', function (err){
      callback(err);
    });
    request.write(requestJSON);
    request.on('response', callback.bind(this, id, request));
  },
  /**
   * Make Socket connection.
   *
   * This implements JSON-RPC over a raw socket. This mode allows us to send and
   * receive as many messages as we like once the socket is established.
   */
  connectSocket: function(callback){
    var self = this;

    var socket = net.connect(this.port, this.host, function (){
      // Submit non-standard 'auth' message for raw sockets.
      if (!_.isEmpty(self.user) && !_.isEmpty(self.password)) {
        conn.call('auth', [self.user, self.password], function (err){
          if (err) {
            callback(err);
          } else {
            callback(null, conn);
          }
        });
        return;
      }

      if (_.isFunction(callback)) {
        callback(null, conn);
      }
    });
    var conn = SocketConnection.create(self, socket);
    var parser = new JsonParser();
    parser.onValue = function (decoded){
      if (this.stack.length) {
        return;
      }

      conn.handleMessage(decoded);
    };
    socket.on('data', function (chunk){
      try {
        parser.write(chunk);
      } catch (err) {
        Endpoint.trace('<--', err.toString());
      }
    });

    return conn;
  },
  stream       : function (method, params, opts, callback){
    if (_.isFunction(opts)) {
      callback = opts;
      opts = {};
    }
    opts = opts || {};

    this.connectHttp(method, params, opts, function (id, request, response){
      if (_.isFunction(callback)) {
        var connection = new events.EventEmitter();
        connection.id = id;
        connection.req = request;
        connection.res = response;
        connection.expose = function (method, callback){
          connection.on('call:' + method, function (data){
            callback.call(null, data.params || []);
          });
        };
        connection.end = function (){
          this.req.connection.end();
        };

        // We need to buffer the response chunks in a nonblocking way.
        var parser = new JsonParser();
        parser.onValue = function (decoded){
          if (this.stack.length) {
            return;
          }

          connection.emit('data', decoded);
          if (
            decoded.hasOwnProperty('result') ||
              decoded.hasOwnProperty('error') &&
                decoded.id === id && _.isFunction(callback)
            ) {
            connection.emit('result', decoded);
          }
          else if (decoded.hasOwnProperty('method')) {
            connection.emit('call:' + decoded.method, decoded);
          }
        };
        if (response) {
          // Handle headers
          connection.res.once('data', function (data){
            if (connection.res.statusCode === 200) {
              callback(null, connection);
            } else {
              callback(new Error('"' + connection.res.statusCode + '"' + data));
            }
          });
          connection.res.on('data', function (chunk){
            try {
              parser.write(chunk);
            } catch (err) {
              // TODO: Is ignoring invalid data the right thing to do?
            }
          });
          connection.res.on('end', function (){
            // TODO: Issue an error if there has been no valid response message
          });
        }
      }
    });
  },
  call         : function (method, params, opts, callback){
    if (_.isFunction(opts)) {
      callback = opts;
      opts = {};
    }
    opts = opts || {};
    Endpoint.trace('-->', 'Http call (method ' + method + '): ' + JSON.stringify(params));

    this.connectHttp(method, params, opts, function (id, request, response){
      // Check if response object exists.
      if (!response) {
        callback(new Error('Have no response object'));
        return;
      }

      var data = '';
      response.on('data', function (chunk){
        data += chunk;
      });
      response.on('end', function (){
        if (response.statusCode !== 200) {
          callback(new Error('"' + response.statusCode + '"' + data))
          ;
          return;
        }
        var decoded = JSON.parse(data);
        if (_.isFunction(callback)) {
          if (!decoded.error) {
            decoded.error = null;
          }
          callback(decoded.error, decoded.result);
        }
      });
    });
  }
});

module.exports = Client;
