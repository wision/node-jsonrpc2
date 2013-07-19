var EventEmitter = ES5Class.define('EventEmitter', function(){
  this.implement(require('events').EventEmitter);
});

module.exports = EventEmitter;

