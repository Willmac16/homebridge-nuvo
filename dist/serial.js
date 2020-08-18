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
                    this.log.error("Consider changing the port or adding a port retry interval in the config.json file for homebridge.");
                }
            }
            else {
                this.log.info("Port setup process seems to have worked. Yay!");
                this.parser = this.port.pipe(new Readline({ delimiter: '\r\n' }));
                this.startTimers();
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
    //config functions
    sourceConfigName(source, name) {
        this.port.write(`*SCFG${source}NAME\"${name}\"\r`);
        this.log.debug(`*SCFG${source}NAME\"${name}\"\r`);
    }
    sourceConfigNuvonet(source, nuvonet) {
        this.port.write(`*SCFG${source}NUVONET${nuvonet}\r`);
        this.log.debug(`*SCFG${source}NUVONET${nuvonet}\r`);
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
            for (var zone = 1; zone <= this.numZones; zone++) {
                if ("#Z" + zone === parts[0]) {
                    this.platform.updateZone(zone, parts);
                }
                else if ("#ZCFG" + zone === parts[0]) {
                    this.platform.addZone(zone, parts);
                }
            }
            for (var source = 1; source <= exports.MAX_SOURCES; source++) {
                if ("#SCFG" + source === parts[0]) {
                    this.platform.addSource(source, parts);
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