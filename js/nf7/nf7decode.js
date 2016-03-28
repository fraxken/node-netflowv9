function nf7PktDecode(msg,rinfo) {
    var out = { header: {
        version: msg.readUInt16BE(0),
        count: msg.readUInt16BE(2),
        uptime: msg.readUInt32BE(4),
        seconds: msg.readUInt32BE(8),
        nseconds: msg.readUInt32BE(12),
        sequence: msg.readUInt32BE(16)
    }, flows: []};
    var buf = msg.slice(24);
    var t;
    while(buf.length>0) {
        out.flows.push({
            ipv4_src_addr: (t=buf.readUInt32BE(0),(parseInt(t/16777216)%256)+'.'+(parseInt(t/65536)%256)+'.'+(parseInt(t/256)%256)+'.'+(t%256)),
            ipv4_dst_addr: (t=buf.readUInt32BE(4),(parseInt(t/16777216)%256)+'.'+(parseInt(t/65536)%256)+'.'+(parseInt(t/256)%256)+'.'+(t%256)),
            ipv4_next_hop: (t=buf.readUInt32BE(8),(parseInt(t/16777216)%256)+'.'+(parseInt(t/65536)%256)+'.'+(parseInt(t/256)%256)+'.'+(t%256)),
            input_snmp: buf.readUInt16BE(12),
            output_snmp: buf.readUInt16BE(14),
            in_pkts: buf.readUInt32BE(16),
            in_bytes: buf.readUInt32BE(20),
            first_switched: buf.readUInt32BE(24),
            last_switched: buf.readUInt32BE(28),
            l4_src_port: buf.readUInt16BE(32),
            l4_dst_port: buf.readUInt16BE(34),
            flags: buf.readUInt8(36),
            tcp_flags: buf.readUInt8(37),
            protocol: buf.readUInt8(38),
            src_tos: buf.readUInt8(39),
            in_as: buf.readUInt16BE(40),
            out_as: buf.readUInt16BE(42),
            src_mask: buf.readUInt8(44),
            dst_mask: buf.readUInt8(45),
            flow_flags: buf.readUInt16BE(46),
            router_sc: (t=buf.readUInt32BE(48),(parseInt(t/16777216)%256)+'.'+(parseInt(t/65536)%256)+'.'+(parseInt(t/256)%256)+'.'+(t%256))
        });
        buf = buf.slice(48);
    }
    return out;
}

module.exports = nf7PktDecode;
