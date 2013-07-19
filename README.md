[![Build Status](https://travis-ci.org/pocesar/node-jsonrpc2.png?branch=master)](https://travis-ci.org/pocesar/node-jsonrpc2)

[![NPM](https://nodei.co/npm/json-rpc2.png?downloads=true)](https://nodei.co/npm/json-rpc2/)

# node-jsonrpc2

This is a JSON-RPC server and client library for node.js <http://nodejs.org/>,
the V8 based evented IO framework.

This fork is a rewrite with proper testing and linted code, compatible with node >= 0.8

## Install

To install node-jsonrpc2 in the current directory, run:

```bash
npm install json-rpc2 --save
```

## Usage

Firing up an efficient JSON-RPC server becomes extremely simple:

```js
var rpc = require('json-rpc2');

var server = rpc.Server.create();

function add(args, opt, callback) {
  callback(null, args[0] + args[1]);
}
server.expose('add', add);

server.listen(8000, 'localhost'); // listen creates an HTTP server
```

And creating a client to speak to that server is easy too:

```js
var rpc = require('json-rpc2');
var util = require('util');

var client = rpc.Client.create(8000, 'localhost');

client.call('add', [1, 2], function(err, result) {
    util.puts('1 + 2 = ' + result);
});
```

Create a raw (socket) server using:

```js
var rpc = require('json-rpc2');

var server = rpc.Server.create();

server.enableAuth('user', 'pass');

server.listenRaw(8080, 'localhost'); // Listen on socket

```

## Debugging

This module uses the [debug](http://github.com) package, to debug it, you need to set the Node
environment variable to jsonrpc, either inside your program using `program.env.DEBUG='jsonrpc'`
or setting it in command line as `set DEBUG=jsonrpc` or `export DEBUG=jsonrpc`


To learn more, see the examples directory, peruse test/jsonrpc-test.js, or
simply "Use The Source, Luke".

More documentation and development is on its way.

