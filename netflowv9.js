"use strict";
const debug         = require('debug')('NetFlowV9');
const dgram         = require('dgram');
const util          = require('util');
const eventEmitter  = require('events');

const nft = require('./js/nf9/nftypes');
const nf1PktDecode = require('./js/nf1/nf1decode');
const nf5PktDecode = require('./js/nf5/nf5decode');
const nf7PktDecode = require('./js/nf7/nf7decode');
const nf9PktDecode = require('./js/nf9/nf9decode');

class NetFlowV9 extends eventEmitter {

    /*
    * constructor(options)
    * Create a new instance of NetFlowV9
    */
    constructor(options) {
        super();
        this.templates  = options.templates || {};
        this.nfTypes    = nft.nfTypes;
        this.nfScope    = nft.nfScope;
        this.socketType = options.socketType || 'udp4';
        this.port       = options.port || null;
        this.proxy      = null;

        //if (options.ipv4num) decIpv4Rule[4] = "o['$name']=buf.readUInt32BE($pos);";
        if (options.nfTypes) this.nfTypes = util._extend(this.nfTypes,options.nfTypes); // Inherit nfTypes
        if (options.nfScope) this.nfScope = util._extend(this.nfScope,options.nfScope); // Inherit nfTypes
        if (options.fwd) this.fwd = options.fwd;

        // Configure proxy
        if (typeof options.proxy == 'object' || typeof options.proxy == 'string') {
            this.configureProxy(options.proxy);
        }

        // Start server
        this.server = dgram.createSocket(this.socketType);

        // Catch all default events
        this.server.on('message',(msg,rinfo) => {
            this.fetch(msg,rinfo);
            if (this.proxy) {
                this.proxy.forEach( param => {
                    this.server.send(msg,0,msg.length,param.port,param.host,function() {})
                } );
            }
        });
        this.server.on('error',err => this.emit('error') );
        this.server.on('close', _ => this.emit('close'));
        this.server.listen(options.port, options.host);
    }

    /*
    * configureProxy(proxy)
    * Configure proxy param
    */
    configureProxy(proxy) {
        this.proxy = [];
        if (typeof proxy == 'string') {
            debug('Defining proxy destination %s',proxy);
            const m = proxy.match(/^(.*)(\:(\d+))$/);
            if (m) {
                this.proxy.push({host: m[1], port: m[3]||5555});
                debug('Proxy added %s:%s',m[1],m[3]||5555);
            }
        } 
        else {
            for (let k in proxy) {
                const v = proxy[k];
                if (typeof v == 'string') {
                    debug('Defining proxy destination %s = %s',k,v);
                    const m = v.match(/^(.*)(\:(\d+))$/);
                    if (m) {
                        this.proxy.push({host: m[1], port: m[3]||5555});
                        debug('Proxy added %s:%s',m[1],m[3]||5555);
                    }
                }
            }
        }
        
        if (this.proxy.length == 0) this.proxy = null;
    }

    /*
     * fetch(msg: string,rinfo: Object{address,port})
     * Fetch and decode UDP message
     */
    fetch(msg,rinfo) {
        const startTime = new Date().getTime();
        if (this.fwd) {
            const data = JSON.parse(msg.toString());
            msg = new Buffer(data.buffer);
            rinfo = data.rinfo;
        }
        if (rinfo.size < 20) return;
        let finalObject = this.nfPktDecode(msg,rinfo);
        const timeMs = (new Date().getTime()) - startTime;
        debug('Flows length => '+finalObject.flows.length);
        if(finalObject) {
            debug('Undefined flows',finalObject);
            return;
        }
        else {
            if (finalObject.flows.length > 0) { // If the packet contain flows.
                finalObject.rinfo = rinfo;
                //o.packet = msg;
                finalObject.decodeMs = timeMs;
                this.emit('message',finalObject);
            } 
            else if (finalObject.templates) { // If the packet is the template.
                finalObject.rinfo = rinfo;
                //o.packet = msg;
                finalObject.decodeMs = timeMs;
                this.emit('template', finalObject);
            } 
            else { // Not a template and not a package with flows content!
                debug('Undecoded flows',finalObject);
            }
        }
        
    };

    /*
     * addTemplate(template: Object,rinfo: Object{address,port})
     * Add a template for NetflowV9. Put your data.templates as template arg value.
     */
    addTemplate (template,rinfo) {
        const id = rinfo.address + ':' + rinfo.port;
        const tId = Object.keys(template[id])[0];
        this.templates[tId] = template[id][tId];
        console.log(this.templates);
    }

    /*
     * nfPktDecode(msg: string,rinfo: Object{address,port})
     * Decode NetflowV9 message.
     */
    nfPktDecode(msg,rinfo) {
        const version = msg.readUInt16BE(0);
        debug('entering into nfPktDecode with version =>'+version);
        switch (version) {
            case 1:
                return nf1PktDecode(msg,rinfo);
            case 5:
                return nf5PktDecode(msg,rinfo);
            case 7:
                return nf7PktDecode(msg,rinfo);
            case 9:
                return nf9PktDecode(msg,rinfo,this.templates);
            default:
                debug('bad header version %d', version);
                return;
        }
    }

}

module.exports = NetFlowV9;
