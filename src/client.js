// flow
require('./lib/adaptor');
const { EventEmitter } = require('events');
const stunServer = require('./stun-server');
const utils = require('./utils');
const WS = require('./ws');

const rtcPeerConnectionConfig = {
    iceServers: Array.isArray(stunServer)
        ? stunServer.map(utils.mapIceServers)
        : []
};

class WebRTC {
    pc: RTCPeerConnection;
    state: Object;
    ws: WS;
    config: Object;
    stream: MediaStream | void;
    buf: Array<Function>;
    constructor(config) {
        config = utils.isPlainObject(config) ? config : {};
        const state = {};
        this.state = state;
        this.config = config;
        this.createStream();
        this.buf = [];
        this.ws = new WS('ws://localhost:8888', {
            onopen: e => {},
            onerror: e => {},
            onmessage: e => {
                try {
                    const data = JSON.parse(e.data);
                    debugger;
                    if (
                        data.cmd === 'rtc_description' &&
                        data.args &&
                        data.args.length
                    ) {
                        const rtc_desc = data.args[0];
                        if (rtc_desc.type === 'offer') {
                            return this.setRemoteDesc(rtc_desc);
                        } else if (rtc_desc.type === 'answer') {
                            return this.answer(rtc_desc);
                        }
                    }
                    if (data.cmd === 'should_rtc_create_offer') {
                        if (!this.stream) {
                            return this.buf.push(() => {
                                this.createOffer();
                            });
                        }
                        this.createOffer();
                    }
                    if (
                        data.cmd === 'candidate' &&
                        data.args &&
                        data.args.length
                    ) {
                        const candi = data.args[0];
                        return this.addCandidate(candi);
                    }
                } catch (err) {
                    console.log(err);
                }
            },
            onclose: e => {}
        });
        this.initRTCConnection();
    }
    initRTCConnection() {
        this.pc = new RTCPeerConnection(rtcPeerConnectionConfig);
        this.pc.onconnectionstatechange = evt => {
            console.warn(evt);
            // debugger;
        };
        this.pc.ondatachannel = evt => {
            // debugger;
        };
        this.pc.onicecandidate = evt => {
            // debugger;
            const _iceCandi = evt.candidate;
            if (_iceCandi) {
                this.ws.send({
                    cmd: 'candidate',
                    args: [_iceCandi.toJSON()]
                });
            }
        };
        this.pc.onicecandidateerror = evt => {
            // debugger;
        };
        this.pc.oniceconnectionstatechange = evt => {
            // debugger;
        };
        this.pc.onicegatheringstatechange = evt => {};
        this.pc.onnegotiationneeded = evt => {
            this.createOffer();
        };
        this.pc.onsignalingstatechange = evt => {
            // debugger;
        };
        this.pc.onstatsended = evt => {
            // debugger;
        };
        this.pc.ontrack = evt => {
            // debugger;
        };
        this.pc.addEventListener('addstream', evt => {
            console.log(evt);
            if (this.config.onaddstream) {
                this.config.onaddstream(evt.stream);
            }
            debugger;
        });
    }
    createOffer() {
        return this.pc
            .createOffer()
            .then(description => {
                return this.pc.setLocalDescription(description).then(() => {
                    this.ws.send({
                        cmd: 'rtc_description',
                        args: [description.toJSON()]
                    });
                });
            })
            .catch(err => {
                throw err;
            });
    }
    setRemoteDesc(description) {
        this.pc
            .setRemoteDescription(description)
            .then(() => {
                // debugger;
                return this.pc.createAnswer();
            })
            .then(description => {
                // debugger;
                return this.pc.setLocalDescription(description).then(() => {
                    debugger;
                    this.ws.send({
                        cmd: 'rtc_description',
                        args: [description.toJSON()]
                    });
                });
            })
            .then(() => {
                this.inited();
            })
            .catch(err => {
                debugger;
            });
    }
    answer(description) {
        this.pc
            .setRemoteDescription(description)
            .then(() => {
                debugger;
                this.inited();
            })
            .catch(err => {
                debugger;
            });
    }
    createStream() {
        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true
            })
            .then(stream => {
                debugger;
                this.stream = stream;
                this.pc.addStream(stream);
                let fn;
                while ((fn = this.buf.pop())) {
                    typeof fn === 'function' && fn();
                }
                return stream;
            })
            .catch(err => {
                debugger;
            });
    }
    inited() {}
    addCandidate(candidate) {
        this.pc
            .addIceCandidate(candidate)
            .then(() => {
                // debugger;
            })
            .catch(err => {
                console.log(err);
                debugger;
            });
    }
}

module.exports = WebRTC;
