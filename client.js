(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebRTC = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],"/Users/lcfme/Desktop/webrtc-client/src/client.js":[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// flow
require('./lib/adaptor');

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

var stunServer = require('./stun-server');
var utils = require('./utils');
var WS = require('./ws');

var rtcPeerConnectionConfig = {
    iceServers: Array.isArray(stunServer) ? stunServer.map(utils.mapIceServers) : []
};

var WebRTC = function () {
    function WebRTC(config) {
        var _this = this;

        _classCallCheck(this, WebRTC);

        config = utils.isPlainObject(config) ? config : {};
        var state = {};
        this.state = state;
        this.config = config;
        this.createStream();
        this.buf = [];
        this.ws = new WS('ws://localhost:8888', {
            onopen: function onopen(e) {},
            onerror: function onerror(e) {},
            onmessage: function onmessage(e) {
                try {
                    var data = JSON.parse(e.data);
                    debugger;
                    if (data.cmd === 'rtc_description' && data.args && data.args.length) {
                        var rtc_desc = data.args[0];
                        if (rtc_desc.type === 'offer') {
                            return _this.setRemoteDesc(rtc_desc);
                        } else if (rtc_desc.type === 'answer') {
                            return _this.answer(rtc_desc);
                        }
                    }
                    if (data.cmd === 'should_rtc_create_offer') {
                        if (!_this.stream) {
                            return _this.buf.push(function () {
                                _this.createOffer();
                            });
                        }
                        _this.createOffer();
                    }
                    if (data.cmd === 'candidate' && data.args && data.args.length) {
                        var candi = data.args[0];
                        return _this.addCandidate(candi);
                    }
                } catch (err) {
                    console.log(err);
                }
            },
            onclose: function onclose(e) {}
        });
        this.initRTCConnection();
    }

    _createClass(WebRTC, [{
        key: 'initRTCConnection',
        value: function initRTCConnection() {
            var _this2 = this;

            this.pc = new RTCPeerConnection(rtcPeerConnectionConfig);
            this.pc.onconnectionstatechange = function (evt) {
                console.warn(evt);
                // debugger;
            };
            this.pc.ondatachannel = function (evt) {
                // debugger;
            };
            this.pc.onicecandidate = function (evt) {
                // debugger;
                var _iceCandi = evt.candidate;
                if (_iceCandi) {
                    _this2.ws.send({
                        cmd: 'candidate',
                        args: [_iceCandi.toJSON()]
                    });
                }
            };
            this.pc.onicecandidateerror = function (evt) {
                // debugger;
            };
            this.pc.oniceconnectionstatechange = function (evt) {
                // debugger;
            };
            this.pc.onicegatheringstatechange = function (evt) {};
            this.pc.onnegotiationneeded = function (evt) {
                _this2.createOffer();
            };
            this.pc.onsignalingstatechange = function (evt) {
                // debugger;
            };
            this.pc.onstatsended = function (evt) {
                // debugger;
            };
            this.pc.ontrack = function (evt) {
                // debugger;
            };
            this.pc.addEventListener('addstream', function (evt) {
                console.log(evt);
                if (_this2.config.onaddstream) {
                    _this2.config.onaddstream(evt.stream);
                }
                debugger;
            });
        }
    }, {
        key: 'createOffer',
        value: function createOffer() {
            var _this3 = this;

            return this.pc.createOffer().then(function (description) {
                return _this3.pc.setLocalDescription(description).then(function () {
                    _this3.ws.send({
                        cmd: 'rtc_description',
                        args: [description.toJSON()]
                    });
                });
            }).catch(function (err) {
                throw err;
            });
        }
    }, {
        key: 'setRemoteDesc',
        value: function setRemoteDesc(description) {
            var _this4 = this;

            this.pc.setRemoteDescription(description).then(function () {
                // debugger;
                return _this4.pc.createAnswer();
            }).then(function (description) {
                // debugger;
                return _this4.pc.setLocalDescription(description).then(function () {
                    debugger;
                    _this4.ws.send({
                        cmd: 'rtc_description',
                        args: [description.toJSON()]
                    });
                });
            }).then(function () {
                _this4.inited();
            }).catch(function (err) {
                debugger;
            });
        }
    }, {
        key: 'answer',
        value: function answer(description) {
            var _this5 = this;

            this.pc.setRemoteDescription(description).then(function () {
                debugger;
                _this5.inited();
            }).catch(function (err) {
                debugger;
            });
        }
    }, {
        key: 'createStream',
        value: function createStream() {
            var _this6 = this;

            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            }).then(function (stream) {
                debugger;
                _this6.stream = stream;
                _this6.pc.addStream(stream);
                var fn = void 0;
                while (fn = _this6.buf.pop()) {
                    typeof fn === 'function' && fn();
                }
                return stream;
            }).catch(function (err) {
                debugger;
            });
        }
    }, {
        key: 'inited',
        value: function inited() {}
    }, {
        key: 'addCandidate',
        value: function addCandidate(candidate) {
            this.pc.addIceCandidate(candidate).then(function () {
                // debugger;
            }).catch(function (err) {
                console.log(err);
                debugger;
            });
        }
    }]);

    return WebRTC;
}();

module.exports = WebRTC;

},{"./lib/adaptor":2,"./stun-server":3,"./utils":4,"./ws":5,"events":1}],2:[function(require,module,exports){
/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

function maybeFixConfiguration(pcConfig) {
  if (!pcConfig) {
    return;
  }
  for (var i = 0; i < pcConfig.iceServers.length; i++) {
    if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
      pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
      delete pcConfig.iceServers[i].urls;
    }
  }
}

if (navigator.mozGetUserMedia) {
  console.log('This appears to be Firefox');

  window.webrtcDetectedBrowser = 'firefox';

  window.webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

  // The RTCPeerConnection object.
  RTCPeerConnection = function RTCPeerConnection(pcConfig, pcConstraints) {
    // .urls is not supported in FF yet.
    maybeFixConfiguration(pcConfig);
    return new mozRTCPeerConnection(pcConfig, pcConstraints);
  };

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  window.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Creates iceServer from the url for FF.
  window.createIceServer = function (url, username, password) {
    var iceServer = null;
    var urlParts = url.split(':');
    if (urlParts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = {
        'url': url
      };
    } else if (urlParts[0].indexOf('turn') === 0) {
      if (webrtcDetectedVersion < 27) {
        // Create iceServer with turn url.
        // Ignore the transport parameter from TURN url for FF version <=27.
        var turnUrlParts = url.split('?');
        // Return null for createIceServer if transport=tcp.
        if (turnUrlParts.length === 1 || turnUrlParts[1].indexOf('transport=udp') === 0) {
          iceServer = {
            'url': turnUrlParts[0],
            'credential': password,
            'username': username
          };
        }
      } else {
        // FF 27 and above supports transport parameters in TURN url,
        // So passing in the full url to create iceServer.
        iceServer = {
          'url': url,
          'credential': password,
          'username': username
        };
      }
    }
    return iceServer;
  };

  window.createIceServers = function (urls, username, password) {
    var iceServers = [];
    // Use .url for FireFox.
    for (var i = 0; i < urls.length; i++) {
      var iceServer = createIceServer(urls[i], username, password);
      if (iceServer !== null) {
        iceServers.push(iceServer);
      }
    }
    return iceServers;
  };

  // Attach a media stream to an element.
  window.attachMediaStream = function (element, stream) {
    console.log('Attaching media stream');
    element.mozSrcObject = stream;
    element.play();
  };

  window.reattachMediaStream = function (to, from) {
    console.log('Reattaching media stream');
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };
} else if (navigator.webkitGetUserMedia) {
  console.log('This appears to be Chrome');

  window.webrtcDetectedBrowser = 'chrome';
  // Temporary fix until crbug/374263 is fixed.
  // Setting Chrome version to 999, if version is unavailable.
  var result = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  if (result !== null) {
    window.webrtcDetectedVersion = parseInt(result[2], 10);
  } else {
    window.webrtcDetectedVersion = 999;
  }

  // Creates iceServer from the url for Chrome M33 and earlier.
  window.createIceServer = function (url, username, password) {
    var iceServer = null;
    var urlParts = url.split(':');
    if (urlParts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = {
        'url': url
      };
    } else if (urlParts[0].indexOf('turn') === 0) {
      // Chrome M28 & above uses below TURN format.
      iceServer = {
        'url': url,
        'credential': password,
        'username': username
      };
    }
    return iceServer;
  };

  // Creates iceServers from the urls for Chrome M34 and above.
  window.createIceServers = function (urls, username, password) {
    var iceServers = [];
    if (webrtcDetectedVersion >= 34) {
      // .urls is supported since Chrome M34.
      iceServers = {
        'urls': urls,
        'credential': password,
        'username': username
      };
    } else {
      for (var i = 0; i < urls.length; i++) {
        var iceServer = createIceServer(urls[i], username, password);
        if (iceServer !== null) {
          iceServers.push(iceServer);
        }
      }
    }
    return iceServers;
  };

  // The RTCPeerConnection object.
  RTCPeerConnection = function RTCPeerConnection(pcConfig, pcConstraints) {
    // .urls is supported since Chrome M34.
    if (webrtcDetectedVersion < 34) {
      maybeFixConfiguration(pcConfig);
    }
    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
  };

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  window.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Attach a media stream to an element.
  window.attachMediaStream = function (element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
  };

  window.reattachMediaStream = function (to, from) {
    to.src = from.src;
  };
} else {
  console.log('Browser does not appear to be WebRTC-capable');
}

},{}],3:[function(require,module,exports){
'use strict';

module.exports = ['stun:stun1.l.google.com:19302'];

},{}],4:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.mapIceServers = function (uri) {
    if (!/^stun:/.test(uri)) throw new Error('not a valid iceServer url');
    return {
        urls: uri
    };
};

exports.isFunction = function (o) {
    return typeof o === 'function';
};

exports.isPlainObject = function (o) {
    if (!o || (typeof o === 'undefined' ? 'undefined' : _typeof(o)) !== 'object') {
        return false;
    }
    return !o.__proto__ || o.__proto__ === Object.prototype;
};

},{}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('./utils'); // flow

var WS = function () {
    function WS(url, config) {
        var _this = this;

        _classCallCheck(this, WS);

        config = config || {};
        this.buf = [];
        this._socket = new WebSocket(url);
        this._socket.onopen = function (e) {
            typeof config.onopen === 'function' && config.onopen.call(_this._socket, e);
            var stuff = void 0;
            while (_this.buf.length) {
                stuff = _this.buf.shift();
                _this.send(stuff);
            }
        };
        this._socket.onerror = function (e) {
            typeof config.onerror === 'function' && config.onerror.call(_this._socket, e);
            _this.destroy();
        };
        this._socket.onmessage = function (e) {
            typeof config.onmessage === 'function' && config.onmessage.call(_this._socket, e);
        };
        this._socket.onclose = function (e) {
            typeof config.onclose === 'function' && config.onclose.call(_this._socket, e);
            _this.destroy();
        };
    }

    _createClass(WS, [{
        key: 'destroy',
        value: function destroy() {
            this._socket.close();
            this._socket = null;
        }
    }, {
        key: 'send',
        value: function send(o) {
            if (!this._socket) throw new Error('ws object has been destroyed.');
            o = utils.isPlainObject(o) ? o : {};
            if (!Object.keys(o).length) return;
            if (this._socket.readyState !== this._socket.OPEN) {
                this.buf.push(o);
            }
            this._socket.send(JSON.stringify(o));
        }
    }]);

    return WS;
}();

module.exports = WS;

},{"./utils":4}]},{},[])("/Users/lcfme/Desktop/webrtc-client/src/client.js")
});
