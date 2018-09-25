// flow
type evtFunc = (evt: Object) => any;
const utils = require('./utils');
class WS {
    url: string;
    config: Object;
    buf: Array<Object>;
    _socket: WebSocket;
    constructor(
        url: string,
        config: {
            onopen?: evtFunc,
            onerror?: evtFunc,
            onmessage?: evtFunc,
            onclose?: evtFunc
        }
    ) {
        config = config || {};
        this.buf = [];
        this._socket = new WebSocket(url);
        this._socket.onopen = e => {
            typeof config.onopen === 'function' &&
                config.onopen.call(this._socket, e);
            let stuff;
            while (this.buf.length) {
                stuff = this.buf.shift();
                this.send(stuff);
            }
        };
        this._socket.onerror = e => {
            typeof config.onerror === 'function' &&
                config.onerror.call(this._socket, e);
            this.destroy();
        };
        this._socket.onmessage = e => {
            typeof config.onmessage === 'function' &&
                config.onmessage.call(this._socket, e);
        };
        this._socket.onclose = e => {
            typeof config.onclose === 'function' &&
                config.onclose.call(this._socket, e);
            this.destroy();
        };
    }
    destroy(): void {
        this._socket.close();
        this._socket = null;
    }
    send(o: Object): void {
        if (!this._socket) throw new Error('ws object has been destroyed.');
        o = utils.isPlainObject(o) ? o : {};
        if (!Object.keys(o).length) return;
        if (this._socket.readyState !== this._socket.OPEN) {
            this.buf.push(o);
        }
        this._socket.send(JSON.stringify(o));
    }
}

module.exports = WS;
