var rpc = require('../src/jsonrpc');


/*
  Connect to HTTP server
*/
var client = new rpc.Client(8088, 'localhost', "myuser", "secret123");

client.call('add', [1, 2], function (err, result) {
  if (err) return printError(err);
  console.log('  1 + 2 = ' + result);
});

client.call('multiply', [199, 2], function (err, result) {
  if (err) return printError(err);
  console.log('199 * 2 = ' + result);
});

// These calls should each take 1.5 seconds to complete
client.call('delayed.echo', ['Echo.', 1500], function (err, result) {
  if (err) return printError(err);
  console.log(result + ', delay 1500 ms');
});


/*
  Connect to Raw socket server
*/
var socketClient = new rpc.Client(8089, 'localhost', "myuser", "secret123");

socketClient.connectSocket(function (err, conn) {
  if (err) return printError(err);
  // Accessing modules is as simple as dot-prefixing.
  conn.call('math.power', [3, 3], function (err, result) {
    if (err) return printError(err);
    console.log('  3 ^ 3 = ' + result);
  });

  // These calls should each take 1 seconds to complete
  conn.call('delayed.add', [1, 1, 1000], function (err, result) {
    if (err) return printError(err);
    console.log('  1 + 1 = ' + result + ', delay 1000 ms');
  });
})


function printError (err) {
  console.error('RPC Error: '+ err.toString());
}
