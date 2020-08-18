"use strict";
const PLUGIN_NAME = "homebridge-nuvo";
const PLATFORM_NAME = "nuvo-platform";
let hap;
let Accessory;
var serial;
class NuvoPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        if (config.port) {
            this.port = config.port;
        }
        else {
            this.log.warn("Currently using a default port path. You should consider figuring out what your port is so this will actually work.");
            this.port = '/dev/tty.usbserial';
        }
        if (config.numZones) {
            this.numZones = config.numZones;
            this.numZones = config.numZones;
        }
        else {
            this.numZones = 8;
        }
        if (config.portRetryInterval) {
            this.portRetryInterval = config.portRetryInterval * 1000;
        }
        else {
            this.portRetryInterval = 0;
        }
        serial = require("./serial");
        this.zoneSourceCombo = new Array(this.numZones + 1);
        const sourceArrayLength = serial.MAX_SOURCES + 1;
        for (var i = 1; i < this.zoneSourceCombo.length; i++) {
            this.zoneSourceCombo[i] = new Array(sourceArrayLength);
        }
        this.zoneConfigs = new Array(this.numZones + 1);
        this.sourceConfigs = new Array(sourceArrayLength);
        api.on("didFinishLaunching" /* DID_FINISH_LAUNCHING */, () => {
            this.serialConnection = new serial.NuvoSerial(this.log, this.port, this.numZones, this.portRetryInterval, this);
        });
    }
    // Make sure this works and doesn't break a promise
    configureAccessory(accessory) {
        this.log.debug(`adding ${accessory.context.zone}, ${accessory.context.source}`);
        accessory.getService(hap.Service.AccessoryInformation)
            .setCharacteristic(hap.Characteristic.Manufacturer, "Will MacCormack")
            .setCharacteristic(hap.Characteristic.Model, "Nuvo Speaker")
            .setCharacteristic(hap.Characteristic.SerialNumber, "NVGC")
            .setCharacteristic(hap.Characteristic.FirmwareRevision, "2.0.0");
        const onChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.On);
        onChar.on("set" /* SET */, (value, callback) => {
            if (value === true) {
                this.serialConnection.zoneOn(accessory.context.zone);
                this.serialConnection.zoneSource(accessory.context.zone, accessory.context.source);
            }
            else {
                this.serialConnection.zoneOff(accessory.context.zone);
            }
            this.serialConnection.zoneAskStatus(accessory.context.zone);
            callback(undefined, value);
        });
        onChar.on("get" /* GET */, (callback) => {
            this.serialConnection.zoneAskStatus(accessory.context.zone);
            callback();
        });
        const brightChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.Brightness);
        brightChar.on("get" /* GET */, (callback) => {
            this.serialConnection.zoneAskStatus(accessory.context.zone);
            callback();
        });
        brightChar.on("set" /* SET */, (value, callback) => {
            if (value == 100) {
                var vol = 59;
            }
            else {
                var vol = Math.round((Number(value) * (79 / 100) - 79) * -1);
            }
            this.serialConnection.zoneVolume(accessory.context.zone, vol);
            callback(undefined, value);
        });
        this.zoneSourceCombo[accessory.context.zone][accessory.context.source] = accessory;
    }
    addAccessory(zoneNum, sourceNum) {
        if (!this.zoneSourceCombo[zoneNum][sourceNum]) {
            const accessoryName = this.zoneConfigs[zoneNum][2].substring(5, (this.zoneConfigs[zoneNum][2].length - 1))
                + " " + this.sourceConfigs[sourceNum][2].substring(5, (this.sourceConfigs[sourceNum][2].length - 1));
            this.log.debug(accessoryName);
            const accessoryUUID = hap.uuid.generate(accessoryName);
            this.log.debug(accessoryUUID);
            const accessory = new Accessory(accessoryName, accessoryUUID);
            accessory.context.zone = zoneNum;
            accessory.context.source = sourceNum;
            accessory.addService(hap.Service.Lightbulb, accessoryName);
            this.configureAccessory(accessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
    }
    addZone(zone, zoneCfg) {
        this.zoneConfigs[zone] = zoneCfg;
        // code to add all sources for this zone
        if (this.zoneConfigs[zone][1] === "ENABLE1") {
            for (var source = 1; source <= serial.MAX_SOURCES; source++) {
                if (this.sourceConfigs[source] && this.sourceConfigs[source][1] === "ENABLE1") {
                    this.addAccessory(zone, source);
                }
            }
        }
    }
    addSource(source, sourceCfg) {
        this.sourceConfigs[source] = sourceCfg;
        if (this.sourceConfigs[source][1] === "ENABLE1") {
            for (var zone = 1; zone <= this.numZones; zone++) {
                if (this.zoneConfigs[zone] && this.zoneConfigs[zone][1] === "ENABLE1") {
                    this.addAccessory(zone, source);
                }
            }
        }
    }
    updateZone(zoneNum, zoneStatus) {
        // code to update all things for that zone
        let sourceOn = 0;
        if (zoneStatus[1] === "ON") {
            sourceOn = Number(zoneStatus[2].substring(3));
        }
        let vol = "VOL79";
        if (zoneStatus[3]) {
            vol = zoneStatus[3];
        }
        if (vol == "MUTE") {
            var volume = 0;
        }
        else {
            var vnum = (parseInt(vol.substring(3)));
            var volume = Math.round(((vnum * -1) + 79) * (100 / 79));
        }
        for (var source = 1; source <= serial.MAX_SOURCES; source++) {
            if (this.zoneSourceCombo[zoneNum][source]) {
                var lightService = this.zoneSourceCombo[zoneNum][source].getService(hap.Service.Lightbulb);
                if (lightService.getCharacteristic(hap.Characteristic.On).value != (source == sourceOn)) {
                    lightService.updateCharacteristic(hap.Characteristic.On, (source == sourceOn));
                }
                if (lightService.getCharacteristic(hap.Characteristic.Brightness).value != volume) {
                    lightService.updateCharacteristic(hap.Characteristic.Brightness, volume);
                }
            }
        }
    }
}
module.exports = (api) => {
    hap = api.hap;
    Accessory = api.platformAccessory;
    api.registerPlatform(PLATFORM_NAME, NuvoPlatform);
};
//# sourceMappingURL=platform.js.map