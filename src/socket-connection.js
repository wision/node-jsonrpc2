'use strict';

var Connection = require('./connection.js');

/**
 * Socket connection.
 *
 * Socket connections are mostly symmetric, so we are using a single class for
 * representing both the server and client perspective.
 */
var SocketConnection = Connection.define('SocketConnection', {
  construct: function (endpoint, conn){
    var self = this;

    this.conn = conn;
    this.endpoint = endpoint;
    this.autoReconnect = true;
    this.ended = true;

    this.conn.on('connect', function (){
      self.emit('connect');
    });

    this.conn.on('end', function (){
      self.emit('end');
    });

    this.conn.on('error', function (){
      self.emit('error');
    });

    this.conn.on('close', function (hadError){
      self.emit('close', hadError);

      if (
          self.endpoint.$className === 'Client' &&
          self.autoReconnect && !self.ended
        ) {
        if (hadError) {
          // If there was an error, we'll wait a moment before retrying
          setTimeout(self.reconnect.bind(self), 200);
        } else {
          self.reconnect();
        }
      }
    });

    this.$super(endpoint);
  },
  write    : function (data){
    if (!this.conn.writable) {
      // Other side disconnected, we'll quietly fail
      return;
    }

    this.conn.write(data);
  },

  end: function (){
    this.ended = true;
    this.conn.end();
  },

  reconnect: function (){
    this.ended = false;
    if (this.endpoint.$className === 'Client') {
      this.conn.connect(this.endpoint.port, this.endpoint.host);
    } else {
      throw new Error('Cannot reconnect a connection from the server-side.');
    }
  }
});

module.exports = SocketConnection;
