exports.mapIceServers = function(uri) {
    if (!/^stun:/.test(uri)) throw new Error('not a valid iceServer url');
    return {
        urls: uri
    };
};

exports.isFunction = function(o) {
    return typeof o === 'function';
};

exports.isPlainObject = function(o) {
    if (!o || typeof o !== 'object') {
        return false;
    }
    return !o.__proto__ || o.__proto__ === Object.prototype;
};
