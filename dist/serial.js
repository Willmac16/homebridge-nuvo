"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuvoSerial = exports.MAX_SOURCES = void 0;
let SerialPort = require('serialport');
let Readline = require('@serialport/parser-readline');
exports.MAX_SOURCES = 6;
class NuvoSerial {
    constructor(log, portPath, numZones, portRetryInterval, platform) {
        this.log = log;
        this.portPath = portPath;
        this.numZones = numZones;
        this.portRetryInterval = portRetryInterval;
        this.platform = platform;
        this.port = new SerialPort(portPath, {
            baudRate: 57600,
            autoOpen: false
        });
        this.openPort();
    }
    openPort() {
        this.port.open((err) => {
            if (err) {
                if (this.portRetryInterval > 0) {
                    this.log.info(`That serial port didn't open right now. I will try again in ${this.portRetryInterval / 1000} second(s).`);
                    setTimeout(this.openPort.bind(this), this.portRetryInterval);
                }
                else {
                    this.log.error("That port does not seem to exist (or this process doesn't have access to it).");
                    if (!this.platform.cli)
                        this.log.error("Consider changing the port or adding a port retry interval in the config.json file for homebridge.");
                    else
                        this.log.error("Consider specifying a port with -p <port_path>.");
                }
            }
            else {
                this.log.info("Port setup process seems to have worked. Yay!");
                this.parser = this.port.pipe(new Readline({ delimiter: '\r\n' }));
                if (!this.platform.cli)
                    this.startTimers();
                else {
                    setTimeout(this.sort.bind(this), 10);
                    setTimeout(this.platform.onPortOpen, 50);
                }
            }
        });
    }
    //Zone functions
    zoneOn(zone) {
        this.port.write(`*Z${zone}ON\r`);
        this.log.debug(`*Z${zone}ON\r`);
    }
    zoneOff(zone) {
        this.port.write(`*Z${zone}OFF\r`);
        this.log.debug(`*Z${zone}OFF\r`);
    }
    zoneSource(zone, source) {
        this.port.write(`*Z${zone}SRC${source}\r`);
        this.log.debug(`*Z${zone}SRC${source}\r`);
    }
    zoneVolume(zone, volume) {
        this.port.write(`*Z${zone}VOL${volume}\r`);
        this.log.debug(`*Z${zone}VOL${volume}\r`);
    }
    zoneMuteOn(zone) {
        this.port.write(`*Z${zone}MUTEON\r`);
        this.log.debug(`*Z${zone}MUTEON\r`);
    }
    zoneMuteOff(zone) {
        this.port.write(`*Z${zone}MUTEOFF\r`);
        this.log.debug(`*Z${zone}MUTEOFF\r`);
    }
    allOff() {
        this.port.write(`*ALLOFF\r`);
        this.log.debug(`*ALLOFF\r`);
    }
    // Source config functions
    sourceConfigName(source, name) {
        this.port.write(`*SCFG${source}NAME\"${name}\"\r`);
        this.log.debug(`*SCFG${source}NAME\"${name}\"\r`);
    }
    sourceConfigShortName(source, name) {
        this.port.write(`*SCFG${source}SHORTNAME\"${name}\"\r`);
        this.log.debug(`*SCFG${source}SHORTNAME\"${name}\"\r`);
    }
    sourceConfigEnable(source, enable) {
        this.port.write(`*SCFG${source}ENABLE${enable}\r`);
        this.log.debug(`*SCFG${source}ENABLE${enable}\r`);
    }
    sourceConfigGain(source, gain) {
        this.port.write(`*SCFG${source}GAIN\"${gain}\"\r`);
        this.log.debug(`*SCFG${source}GAIN\"${gain}\"\r`);
    }
    sourceConfigNuvonet(source, nuvonet) {
        this.port.write(`*SCFG${source}NUVONET${nuvonet}\r`);
        this.log.debug(`*SCFG${source}NUVONET${nuvonet}\r`);
    }
    // Zone Config functions
    zoneConfigEnable(zone, enable) {
        this.port.write(`*ZCFG${zone}ENABLE${enable}\r`);
        this.log.debug(`*ZCFG${zone}ENABLE${enable}\r`);
    }
    zoneConfigName(zone, name) {
        this.port.write(`*ZCFG${zone}NAME\"${name}\"\r`);
        this.log.debug(`*ZCFG${zone}NAME\"${name}\"\r`);
    }
    zoneConfigBass(zone, bass) {
        this.port.write(`*ZCFG${zone}BASS${bass}\r`);
        this.log.debug(`*ZCFG${zone}BASS${bass}\r`);
    }
    zoneConfigTreble(zone, treble) {
        this.port.write(`*ZCFG${zone}TREB${treble}\r`);
        this.log.debug(`*ZCFG${zone}TREB${treble}\r`);
    }
    zoneConfigBalance(zone, balance) {
        if (balance < 0) {
            this.port.write(`*ZCFG${zone}BALL${balance}\r`);
            this.log.debug(`*ZCFG${zone}BALL${balance}\r`);
        }
        else if (balance === 0) {
            this.port.write(`*ZCFG${zone}BALC\r`);
            this.log.debug(`*ZCFG${zone}BALC\r`);
        }
        else {
            this.port.write(`*ZCFG${zone}BALR${balance * -1}\r`);
            this.log.debug(`*ZCFG${zone}BALR${balance * -1}\r`);
        }
    }
    zoneConfigLoudComp(zone, enable) {
        this.port.write(`*ZCFG${zone}LOUDCMP${enable}\r`);
        this.log.debug(`*ZCFG${zone}LOUDCMP${enable}\r`);
    }
    //Status functions
    zoneAskStatus(zone) {
        this.port.write(`*Z${zone}STATUS?\r`);
        this.log.debug(`*Z${zone}STATUS?\r`);
    }
    allZoneStatus() {
        for (var i = 1; i <= this.numZones; i++) {
            var delay = ((i) * 50);
            setTimeout(this.zoneAskStatus.bind(this), delay, i);
        }
    }
    zoneAskConfig(zone) {
        this.port.write(`*ZCFG${zone}STATUS?\r`);
        this.log.debug(`*ZCFG${zone}STATUS?\r`);
    }
    zoneAskEQ(zone) {
        this.port.write(`*ZCFG${zone}EQ?\r`);
        this.log.debug(`*ZCFG${zone}EQ?\r`);
    }
    allZoneConfig() {
        for (var i = 1; i <= this.numZones; i++) {
            var delay = ((i) * 50);
            setTimeout(this.zoneAskConfig.bind(this), delay, i);
        }
    }
    sourceAskConfig(source) {
        this.port.write(`*SCFG${source}STATUS?\r`);
        this.log.debug(`*SCFG${source}STATUS?\r`);
    }
    allSourceConfig() {
        for (var i = 1; i <= exports.MAX_SOURCES; i++) {
            var delay = ((i) * 50);
            setTimeout(this.sourceAskConfig.bind(this), delay, i);
        }
    }
    statusCheck(seconds) {
        var interval = seconds * 1000;
        setInterval((log, allZoneStatus) => {
            log.debug("I am checking every " + seconds + " seconds.");
            allZoneStatus();
        }, interval, this.log, this.allZoneStatus.bind(this));
    }
    listen(callback) {
        this.port.open(() => {
            this.parser.on('data', function (data) {
                if (data.trim() !== '') {
                    return callback(data);
                }
            });
        });
    }
    sort() {
        this.listen((data) => {
            var parts = data.split(",");
            if (!this.platform.cli) {
                if ("#Z" === parts[0].substring(0, 2)) {
                    if ("#ZCFG" === parts[0].substring(0, 5)) {
                        let zone = parseInt(parts[0].substring(5));
                        this.platform.addZone(zone, parts);
                    }
                    else {
                        let zone = parseInt(parts[0].substring(2));
                        this.platform.updateZone(zone, parts);
                    }
                }
                else if ("#SCFG" === parts[0].substring(0, 5)) {
                    let source = parseInt(parts[0].substring(5));
                    this.platform.addSource(source, parts);
                }
            }
            else {
                let formatted = {};
                if ("#ZCFG" === parts[0].substring(0, 5)) {
                    formatted['zone'] = parts[0].substring(5);
                    if (parts[1].substring(0, 6) === "ENABLE") {
                        if (parts[1].substring(6) === "1") {
                            formatted['enabled'] = true;
                            formatted['name'] = parts[2].substring(5, parts[2].length - 1);
                            // formatted['linkedTo'] = parts[3].substring(7);
                            // formatted['group'] = parts[4].substring(5);
                            // formatted['sourcesEnabled'] = parseInt(parts[5].substring(7));
                        }
                        else {
                            formatted['enabled'] = false;
                        }
                    }
                    else {
                        formatted['bass'] = parseInt(parts[1].substring(4));
                        formatted['treble'] = parseInt(parts[2].substring(4));
                        formatted['balance'] = parts[3];
                        formatted['loudcomp'] = parts[4].substring(7) === "1";
                    }
                }
                else if ("#SCFG" === parts[0].substring(0, 5)) {
                    formatted['source'] = parts[0].substring(5);
                    if (parts[1].substring(6) === "1") {
                        formatted['enabled'] = true;
                        formatted['name'] = parts[2].substring(5, parts[2].length - 1);
                        formatted['gain'] = parts[3].substring(4);
                        formatted['nuvonet'] = parts[4].substring(7) === "1";
                        formatted['shortname'] = parts[5].substring(10, 13);
                    }
                    else {
                        formatted['enabled'] = false;
                    }
                }
                this.log.log('nuvo', JSON.stringify(formatted));
                this.platform.outstandingCmds--;
                if (this.platform.outstandingCmds <= 0) {
                    this.platform.prompt();
                    this.platform.outstandingCmds = 0;
                }
            }
        });
    }
    startTimers() {
        this.log.debug("Starting the timers ");
        setTimeout(this.sort.bind(this), 1500);
        setTimeout(this.allSourceConfig.bind(this), 2000);
        setTimeout(this.allZoneConfig.bind(this), 3500);
        setTimeout(this.allZoneStatus.bind(this), 5000);
        this.statusCheck(300);
    }
}
exports.NuvoSerial = NuvoSerial;
//# sourceMappingURL=serial.js.map