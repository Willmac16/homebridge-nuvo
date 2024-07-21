import {
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
} from "homebridge";

import {
    NuvoSerial
} from "./serial";


const PLUGIN_NAME = "homebridge-nuvo";
const PLATFORM_NAME = "nuvo-platform";

let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
   hap = api.hap;
   Accessory = api.platformAccessory;

   api.registerPlatform(PLATFORM_NAME, NuvoPlatform);
};


var serial: any;

class NuvoPlatform implements DynamicPlatformPlugin {
    log: Logging;
    readonly api: API;

    readonly port: string;
    readonly numZones: number;
    readonly powOnVol: number;
    readonly portRetryInterval: number;
    private serialConnection: NuvoSerial;

    readonly zoneConfigs: string[][];
    readonly sourceConfigs: string[][];

    readonly zoneSource: number[];
    readonly zoneVolume: number[];

    readonly zoneSourceCombo: PlatformAccessory[][];

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.log = log;
        this.api = api;

        if (config.port) {
            this.port = config.port;
        } else {
            this.log.warn("Currently using a default port path. You should consider figuring out what your port is so this will actually work.");
            this.port = '/dev/tty.usbserial';
        }

        if (config.numZones) {
          this.numZones = config.numZones;
        } else {
          this.numZones = 8;
        }

        if (config.powerOnVolume) {
            this.powOnVol = Math.round((Number(config.powerOnVolume)*(79/100)-79)*-1);
        } else {
            this.powOnVol = 59;
        }

        if (config.portRetryInterval) {
          this.portRetryInterval = config.portRetryInterval * 1000;
        } else {
          this.portRetryInterval = 0;
        }

        serial = require("./serial");

        const zoneArrayLength: number = this.numZones + 1;

        this.zoneSourceCombo = new Array(zoneArrayLength);

        const sourceArrayLength: number = serial.MAX_SOURCES + 1;


        for (var i = 1; i < this.zoneSourceCombo.length; i++) {
            this.zoneSourceCombo[i] = new Array(sourceArrayLength);
        }

        this.zoneConfigs = new Array(zoneArrayLength);
        this.sourceConfigs = new Array(sourceArrayLength);

        this.zoneSource = new Array(zoneArrayLength);
        this.zoneVolume = new Array(zoneArrayLength);

        api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.serialConnection = new serial.NuvoSerial(this.log, this.port, this.numZones, this.portRetryInterval, this);
        });
    }

    configureAccessory(accessory: PlatformAccessory) {
        this.log.debug(`adding ${accessory.context.zone}, ${accessory.context.source}`);

        accessory.getService(hap.Service.AccessoryInformation)
            .setCharacteristic(hap.Characteristic.Manufacturer, "Will MacCormack")
            .setCharacteristic(hap.Characteristic.Model, "Nuvo Speaker")
            .setCharacteristic(hap.Characteristic.SerialNumber, "NVGC-"+accessory.context.zone+"-"+accessory.context.source)
            .setCharacteristic(hap.Characteristic.FirmwareRevision, "2.0.0");

        const onChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.On);

        onChar.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            if (value === true) {
                this.serialConnection.zoneOn(accessory.context.zone);
                this.serialConnection.zoneSource(accessory.context.zone, accessory.context.source);
            } else {
                this.serialConnection.zoneOff(accessory.context.zone);
            }

            callback();
        });

        onChar.on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
            let on = this.zoneSource[accessory.context.zone] === accessory.context.source;
            callback(undefined, on);
        });

        const brightChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.Brightness);

        brightChar.on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
            let on = this.zoneSource[accessory.context.zone] === accessory.context.source;
            if (on) {
                let vol = this.zoneVolume[accessory.context.zone];
                callback(undefined, vol);
            } else {
                callback(undefined, 0);
            }
        });

        brightChar.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            // Logic to handle the power on to 100% behavior from home app
            if (value === 100) {
                var vol = this.powOnVol;
                this.serialConnection.zoneOn(accessory.context.zone);

                // Set the volume to the power on volume config param 1 second in the future
                setTimeout(this.serialConnection.zoneVolume.bind(this), 1000, accessory.context.zone, vol);
            } else {
                var vol = Math.round((Number(value)*(79/100)-79)*-1);

                this.serialConnection.zoneVolume(accessory.context.zone, vol);
            }
            callback();
        });

        this.zoneSourceCombo[accessory.context.zone][accessory.context.source] = accessory;

        // create element for this plugin's tracking of zone state in source and volume
        if (!this.zoneSource[accessory.context.zone]) {
            this.zoneSource[accessory.context.zone] = 0;
            this.zoneVolume[accessory.context.zone] = 0;
        }
    }

    addAccessory(zoneNum: number, sourceNum: number) {
        if (!this.zoneSourceCombo[zoneNum][sourceNum]) {
            const accessoryName = this.zoneConfigs[zoneNum][2].substring(5, (this.zoneConfigs[zoneNum][2].length-1))
            + " " + this.sourceConfigs[sourceNum][2].substring(5, (this.sourceConfigs[sourceNum][2].length-1));

            this.log.debug(accessoryName);
            const accessoryUUID = hap.uuid.generate(accessoryName+zoneNum+sourceNum);
            this.log.debug(accessoryUUID);

            const accessory = new Accessory(accessoryName, accessoryUUID);

            accessory.context.zone = zoneNum;
            accessory.context.source = sourceNum;

            accessory.addService(hap.Service.Lightbulb, accessoryName);

            this.configureAccessory(accessory);

            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
    }

    removeAccessory(zoneNum: number, sourceNum: number) {
        if (this.zoneSourceCombo[zoneNum][sourceNum]) {
            let accessory = this.zoneSourceCombo[zoneNum][sourceNum];

            this.log.debug(`removing ${zoneNum}, ${sourceNum}`);
            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
    }

    addZone(zone: number, zoneCfg: string[]) {
        this.zoneConfigs[zone] = zoneCfg;

        // code to add all sources for this zone
        if (this.zoneConfigs[zone][1] === "ENABLE1") {
            for (var source = 1; source <= serial.MAX_SOURCES; source++) {
                if (this.sourceConfigs[source] && this.sourceConfigs[source][1] === "ENABLE1") {
                    this.addAccessory(zone, source);
                }
            }
        } else {
            for (var source = 1; source <= serial.MAX_SOURCES; source++) {
                this.removeAccessory(zone, source);
            }
        }
    }

    addSource(source: number, sourceCfg: string[]) {
        this.sourceConfigs[source] = sourceCfg;


        if (this.sourceConfigs[source][1] === "ENABLE1") {
            for (var zone = 1; zone <= this.numZones; zone++) {
                if (this.zoneConfigs[zone] && this.zoneConfigs[zone][1] === "ENABLE1") {
                    this.addAccessory(zone, source);
                }
            }
        } else {
            for (var zone = 1; zone <= this.numZones; zone++) {
                this.removeAccessory(zone, source);
            }
        }
    }

    updateZone(zoneNum: number, zoneStatus: string[]) {
        // code to update all things for that zone
        this.log.debug(`update zone ${zoneNum} with ${zoneStatus}`);

        let sourceOn = 0;

        if (zoneStatus[1] === "ON") {
            sourceOn = Number(zoneStatus[2].substring(3));
        }

        
        let lastSource = this.zoneSource[zoneNum];
        this.zoneSource[zoneNum] = sourceOn;


        let vol = "VOL79";

        if (zoneStatus[3]) {
            vol = zoneStatus[3];
        }

        if (vol === "MUTE") {
            var volume = 0;
        } else {
            var vnum = (parseInt(vol.substring(3)));
            var volume = Math.round(((vnum*-1)+79)*(100/79));
        }

        let lastVol = this.zoneVolume[zoneNum];
        this.zoneVolume[zoneNum] = volume;
            
        if (lastSource !== sourceOn) {
            if (lastSource !== 0 && this.zoneSourceCombo[zoneNum][lastSource]) {
                this.log.debug(`Messing with ${zoneNum} ${lastSource}`);
                this.zoneSourceCombo[zoneNum][lastSource].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.On, false);
                this.zoneSourceCombo[zoneNum][lastSource].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, 0);
            }
            if (sourceOn !== 0 && this.zoneSourceCombo[zoneNum][sourceOn]) {
                this.log.debug(`Mess ${zoneNum} ${sourceOn}`);
                this.zoneSourceCombo[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.On, true);
                this.zoneSourceCombo[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, volume);
            }
        } else if (lastVol !== volume) {
            if (sourceOn !== 0) {
                this.zoneSourceCombo[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, volume);
            }
        }    
    }
}
