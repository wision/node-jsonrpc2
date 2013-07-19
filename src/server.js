'use strict';

var
  net = require('net'),
  http = require('http'),
  JsonParser = require('jsonparse'),

  UNAUTHORIZED =
    'Unauthorized\n',
  METHOD_NOT_ALLOWED =
    'Method Not Allowed\n',
  INVALID_REQUEST =
    'Invalid Request\n',

  errors = {
    '-32700': 'Parse error',
    '-32600': 'Invalid Request',
    '-32601': 'Method not found',
    '-32602': 'Invalid params',
    '-32603': 'Internal error'
  },

  SocketConnection = require('./socket-connection.js'),
  HttpServerConnection = require('./http-server-connection.js');

/**
 * JSON-RPC Server.
 */
var Server = Endpoint.define('Server', {
  construct: function (opts){
    this.opts = opts || {};
    this.opts.type = typeof this.opts.type !== 'undefined' ? this.opts.type : 'http';
    this.$super();
  },
  /**
   * Start listening to incoming connections.
   */
  listen   : function (port, host){
    var server = http.createServer(this.handleHttp.bind(this));
    server.listen(port, host);
    Endpoint.trace('***', 'Server listening on http://' +
      (host || '127.0.0.1') + ':' + port + '/');
    return server;
  },

  listenRaw: function (port, host){
    var server = net.createServer(this.handleRaw.bind(this));
    server.listen(port, host);
    Endpoint.trace('***', 'Server listening on tcp://' +
      (host || '127.0.0.1') + ':' + port + '/');
    return server;
  },

  listenHybrid: function (port, host){
    var httpServer = http.createServer(this.handleHttp.bind(this));
    var server = net.createServer(this.handleHybrid.bind(this, httpServer));
    server.listen(port, host);
    Endpoint.trace('***', 'Server (hybrid) listening on socket://' +
      (host || '127.0.0.1') + ':' + port + '/');
    return server;
  },

  /**
   * Handle HTTP POST request.
   */
  handleHttp: function (req, res){
    Endpoint.trace('<--', 'Accepted http request');

    if (req.method !== 'POST') {
      Server.handleHttpError(req, res, 405, METHOD_NOT_ALLOWED);
      return;
    }

    var buffer = '';
    var self = this;

    // Check authentication if we require it
    if (this.authHandler) {
      var authHeader = req.headers['authorization'] || '', // get the header
        authToken = authHeader.split(/\s+/).pop() || '', // get the token
        auth = new Buffer(authToken, 'base64').toString(), // base64 -> string
        parts = auth.split(/:/), // split on colon
        username = parts[0],
        password = parts[1];
      if (!this.authHandler(username, password)) {
        Server.handleHttpError(req, res, 401, UNAUTHORIZED);
        return;
      }
    }

    var handle = function (buf){
      // Check if json is valid JSON document
      var decoded;

      try {
        decoded = JSON.parse(buf);
      } catch (error) {
        Server.handleHttpError(req, res, 400, INVALID_REQUEST);
        return;
      }

      // Check for the required fields, and if they aren't there, then
      // dispatch to the handleHttpError function.
      if (!(decoded.method && decoded.params && decoded.id)) {
        Endpoint.trace('-->', 'Response (invalid request)');
        Server.handleHttpError(req, res, 400, INVALID_REQUEST);
        return;
      }

      var reply = function (json){
        var encoded = JSON.stringify(json);

        if (!conn.isStreaming) {
          res.writeHead(200, {'Content-Type': 'application/json',
            'Content-Length'                : encoded.length});
          res.write(encoded);
          res.end();
        } else {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.write(encoded);
          // Keep connection open
        }
      };

      var callback = function (err, result){
        if (err) {
          if (self.listeners('error').length) {
            self.emit('error', err);
          }
          Endpoint.trace('-->', 'Failure (id ' + decoded.id + '): ' +
            (err.stack ? err.stack : err.toString()));
          err = err.toString();
          result = null;
        } else {
          Endpoint.trace('-->', 'Response (id ' + decoded.id + '): ' +
            JSON.stringify(result));
          err = null;
        }

        // Don't return a message if it doesn't have an ID
        if (Endpoint.hasId(decoded)) {
          reply({
            'jsonrpc': '2.0',
            'result' : result,
            'error'  : err,
            'id'     : decoded.id
          });
        }
      };

      var conn = HttpServerConnection.create(self, req, res);

      self.handleCall(decoded, conn, callback);
    }; // function handle(buf)

    req.addListener('data', function (chunk){
      buffer = buffer + chunk;
    });

    req.addListener('end', function (){
      handle(buffer);
    });
  },

  handleRaw: function (socket){
    Endpoint.trace('<--', 'Accepted socket connection');

    var self = this;

    var conn = SocketConnection.create(this, socket);
    var parser = new JsonParser();
    var requireAuth = !!this.authHandler;

    parser.onValue = function (decoded){
      if (this.stack.length) {
        return;
      }

      // We're on a raw TCP socket. To enable authentication we implement a simple
      // authentication scheme that is non-standard, but is easy to call from any
      // client library.
      //
      // The authentication message is to be sent as follows:
      //   {'method': 'auth', 'params': ['myuser', 'mypass'], id: 0}
      if (requireAuth) {
        if (decoded.method !== 'auth') {
          // Try to notify client about failure to authenticate
          if (Endpoint.hasId(decoded)) {
            conn.sendReply('Error: Unauthorized', null, decoded.id);
          }
        } else {
          // Handle 'auth' message
          if (_.isArray(decoded.params) &&
            decoded.params.length === 2 &&
            self.authHandler(decoded.params[0], decoded.params[1])) {
            // Authorization completed
            requireAuth = false;

            // Notify client about success
            if (Endpoint.hasId(decoded)) {
              conn.sendReply(null, true, decoded.id);
            }
          } else {
            if (Endpoint.hasId(decoded)) {
              conn.sendReply('Error: Invalid credentials', null, decoded.id);
            }
          }
        }
        // Make sure we explicitly return here - the client was not yet auth'd.
        return;
      } else {
        conn.handleMessage(decoded);
      }
    };

    socket.on('data', function (chunk){
      try {
        parser.write(chunk);
      } catch (err) {
        // TODO: Is ignoring invalid data the right thing to do?
      }
    });
  },

  handleHybrid: function (httpServer, socket){
    var self = this;
    socket.once('data', function (chunk){
      // If first byte is a capital letter, treat connection as HTTP
      if (chunk[0] >= 65 && chunk[0] <= 90) {
        httpServer.emit('connection', socket);
      } else {
        self.handleRaw(socket);
      }
      // Re-emit first chunk
      socket.emit('data', chunk);
    });
  },

  /**
   * Set the server to require authentication.
   *
   * Can be called with a custom handler function:
   *   server.enableAuth(function (user, password) {
   *     return true; // Do authentication and return result as boolean
   *   });
   *
   * Or just with a single valid username and password:
   *   sever.enableAuth(''myuser'', ''supersecretpassword'');
   */
  enableAuth: function (handler, password){
    if (!_.isFunction(handler)) {
      var user = '' + handler;
      password = '' + password;

      handler = function checkAuth(suppliedUser, suppliedPassword){
        return user === suppliedUser && password === suppliedPassword;
      };
    }

    this.authHandler = handler;
  }
}, {
  /**
   * Handle a low level server error.
   */
  handleHttpError: function (req, res, code, message){
    var headers = {'Content-Type': 'text/plain',
      'Content-Length'           : message.length,
      'Allow'                    : 'POST'};

    if (code === 401) {
      headers['WWW-Authenticate'] = 'Basic realm=' + 'JSON-RPC' + '';
    }

    res.writeHead(code, headers);
    res.write(message);
    res.end();
  }
});

module.exports = Server;
