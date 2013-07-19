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

``` javascript
var rpc = require('json-rpc2');

var server = rpc.Server.create();

function add(args, opt, callback) {
  callback(null, args[0] + args[1]);
}
server.expose('add', add);

server.listen(8000, 'localhost');
```

And creating a client to speak to that server is easy too:

``` javascript
var rpc = require('json-rpc2');
var util = require('util');

var client = rpc.Client.create(8000, 'localhost');

client.call('add', [1, 2], function(err, result) {
    util.puts('1 + 2 = ' + result);
});
```

To learn more, see the examples directory, peruse test/jsonrpc-test.js, or
simply "Use The Source, Luke".

More documentation and development is on its way.
