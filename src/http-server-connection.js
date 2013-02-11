var util = require('util');

var Connection = require('./connection.js');

var HttpServerConnection = function (server, req, res) {
	Connection.call(this, server);

	var self = this;

	this.req = req;
	this.res = res;
	this.isStreaming = false;

	this.res.connection.on('end', function () {
		self.emit('end');
	});
};

util.inherits(HttpServerConnection, Connection);

/**
 * Can be called before the response callback to keep the connection open.
 */
HttpServerConnection.prototype.stream = function (onend) {
	Connection.prototype.stream.call(this, onend);

	this.isStreaming = true;
};

/**
 * Send the client additional data.
 *
 * An HTTP connection can be kept open and additional RPC calls sent through if
 * the client supports it.
 */
HttpServerConnection.prototype.write = function (data) {
	if (!this.isStreaming) {
		throw new Error("Cannot send extra messages via non-streaming HTTP");
	}

	if (!this.res.connection.writable) {
		// Client disconnected, we'll quietly fail
		return;
	}

	this.res.write(data);
};

module.exports = HttpServerConnection
