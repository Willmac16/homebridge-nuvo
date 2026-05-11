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
  readonly statusCheckInterval: number;
  private serialConnection: NuvoSerial;

  readonly zone_configs: string[][];
  readonly source_configs: string[][];

  readonly zone_sources: number[];
  readonly zone_volumes: number[];

  readonly zone_source_combos: PlatformAccessory[][];

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
      this.powOnVol = this.centToDb(config.powerOnVolume);
    } else {
      this.powOnVol = 59;
    }

    this.log.debug(`Plugin Configured w/ Power on Decibles of ${this.powOnVol}`);

    if (config.portRetryInterval) {
      this.portRetryInterval = config.portRetryInterval * 1000;
    } else {
      this.portRetryInterval = 0;
    }

    this.statusCheckInterval = config.statusCheckInterval ?? 300;

    serial = require("./serial");

    const zoneArrayLength: number = this.numZones + 1;

    this.zone_source_combos = new Array(zoneArrayLength);

    const sourceArrayLength: number = serial.MAX_SOURCES + 1;


    for (var i = 1; i < this.zone_source_combos.length; i++) {
      this.zone_source_combos[i] = new Array(sourceArrayLength);
    }

    this.zone_configs = new Array(zoneArrayLength);
    this.source_configs = new Array(sourceArrayLength);

    this.zone_sources = new Array(zoneArrayLength);
    this.zone_volumes = new Array(zoneArrayLength);

    api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      this.serialConnection = new serial.NuvoSerial(this.log, this.port, this.numZones, this.portRetryInterval, this.statusCheckInterval, this);
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug(`adding ${accessory.context.zone}, ${accessory.context.source}`);

    accessory.getService(hap.Service.AccessoryInformation)
      .setCharacteristic(hap.Characteristic.Manufacturer, "Will MacCormack")
      .setCharacteristic(hap.Characteristic.Model, "Nuvo Speaker")
      .setCharacteristic(hap.Characteristic.SerialNumber, "NVGC-" + accessory.context.zone + "-" + accessory.context.source)
      .setCharacteristic(hap.Characteristic.FirmwareRevision, "2.0.0");

    const onChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.On);

    onChar.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      if (value === true) {

        let alreadyOn = this.zone_sources[accessory.context.zone] !== 0;
        let existingVol = this.zone_volumes[accessory.context.zone];
        let targetVol = 0;

        // Only request powOnVol if its currently off & no vol request is outstanding
        if (!alreadyOn) {
          if (existingVol <= 0 || existingVol >= 100) {
            targetVol = this.powOnVol;
          }
        }

        this.log.debug(`Turning On Zone ${accessory.context.zone}: alreadyOn? ${alreadyOn}; existingVol ${existingVol} targetVol ${targetVol}`);

        this.serialConnection.zoneOn(accessory.context.zone);
        this.serialConnection.zoneSource(accessory.context.zone, accessory.context.source);

        // Only command volume if we need to
        if (targetVol > 0) {
          this.serialConnection.zoneVolume(accessory.context.zone, targetVol);
          brightChar.updateValue(this.dbToCent(targetVol));
        }

      } else {
        this.log.debug(`Turning Off Zone ${accessory.context.zone}`);
        this.serialConnection.zoneOff(accessory.context.zone);
        brightChar.updateValue(0);
      }

      callback();
      onChar.updateValue(value);
    });

    onChar.on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
      let on = this.zone_sources[accessory.context.zone] === accessory.context.source;
      callback(undefined, on);
    });

    const brightChar = accessory.getService(hap.Service.Lightbulb).getCharacteristic(hap.Characteristic.Brightness);

    brightChar.on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
      let on = this.zone_sources[accessory.context.zone] === accessory.context.source;
      if (on) {
        let vol = this.zone_volumes[accessory.context.zone];
        callback(undefined, vol);
      } else {
        callback(undefined, 0);
      }
    });

    brightChar.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      let alreadyOn = this.zone_sources[accessory.context.zone] !== 0;
      let vol = this.centToDb(Number(value));

      // Logic to handle the power on to 100% behavior from home app
      // Should allow 100% only after initial power on
      if (value === 100 && !alreadyOn) {
        vol = this.powOnVol;
      }

      let callback_val = this.dbToCent(vol);

      this.log.debug(`Setting Vol: Zone ${accessory.context.zone}; homekit-request ${value}; actual-percent ${callback_val}; alreadyOn: ${alreadyOn}`);

      if (!alreadyOn && Number(value) > 0) {
        this.serialConnection.zoneOn(accessory.context.zone);
        this.serialConnection.zoneSource(accessory.context.zone, accessory.context.source);
        onChar.updateValue(true);
      }

      // Preemptively mark that zone volume was requested (so onChar -> on state doesn't override)
      this.zone_volumes[accessory.context.zone] = vol;

      this.serialConnection.zoneVolume(accessory.context.zone, vol);

      callback();
      brightChar.updateValue(callback_val);
    });

    this.zone_source_combos[accessory.context.zone][accessory.context.source] = accessory;

    // create element for this plugin's tracking of zone state in source and volume
    if (!this.zone_sources[accessory.context.zone]) {
      this.zone_sources[accessory.context.zone] = 0;
      this.zone_volumes[accessory.context.zone] = 0;
    }
  }

  addAccessory(zoneNum: number, sourceNum: number) {
    if (!this.zone_source_combos[zoneNum][sourceNum]) {
      const accessoryName = this.zone_configs[zoneNum][2].substring(5, (this.zone_configs[zoneNum][2].length - 1))
        + " " + this.source_configs[sourceNum][2].substring(5, (this.source_configs[sourceNum][2].length - 1));

      this.log.debug(accessoryName);
      const accessoryUUID = hap.uuid.generate(accessoryName + zoneNum + sourceNum);
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
    if (this.zone_source_combos[zoneNum][sourceNum]) {
      let accessory = this.zone_source_combos[zoneNum][sourceNum];

      this.log.debug(`removing ${zoneNum}, ${sourceNum}`);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  addZone(zone: number, zoneCfg: string[]) {
    this.zone_configs[zone] = zoneCfg;

    // code to add all sources for this zone
    if (this.zone_configs[zone][1] === "ENABLE1") {
      for (var source = 1; source <= serial.MAX_SOURCES; source++) {
        if (this.source_configs[source] && this.source_configs[source][1] === "ENABLE1") {
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
    this.source_configs[source] = sourceCfg;


    if (this.source_configs[source][1] === "ENABLE1") {
      for (var zone = 1; zone <= this.numZones; zone++) {
        if (this.zone_configs[zone] && this.zone_configs[zone][1] === "ENABLE1") {
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


    let lastSource = this.zone_sources[zoneNum];
    this.zone_sources[zoneNum] = sourceOn;


    let vol = "VOL79";

    if (zoneStatus[3]) {
      vol = zoneStatus[3];
    }

    if (vol === "MUTE") {
      var volume = 0;
    } else {
      // Convert a "VOL" + db reading into a percentage
      var vnum = parseInt(vol.substring(3));
      var volume = this.dbToCent(vnum);
    }


    // Weird Homekit behavior on zero (says we're at 100%)
    // add in a small number to help
    // const epsilon = 1
    // if (volume === 0) {
    //   volume += epsilon;
    // }


    let lastVol = this.zone_volumes[zoneNum];

    if (sourceOn !== 0) {
      this.zone_volumes[zoneNum] = volume;
    } else {
      this.zone_volumes[zoneNum] = 0;
    }

    this.log.debug(`Zone Volume Status: zone ${zoneNum} source on ${sourceOn} vol string ${vol} volume ${volume} zone_volumes[] ${this.zone_volumes[zoneNum]}`);

    if (lastSource !== sourceOn) {
      if (lastSource !== 0 && this.zone_source_combos[zoneNum][lastSource]) {
        this.log.debug(`Source change: turning off zone ${zoneNum} source ${lastSource}`);
        this.zone_source_combos[zoneNum][lastSource].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.On, false);
        this.zone_source_combos[zoneNum][lastSource].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, 0);
      }
      if (sourceOn !== 0 && this.zone_source_combos[zoneNum][sourceOn]) {
        this.log.debug(`Source change: turning on zone ${zoneNum} source ${sourceOn} at ${volume}%`);
        this.zone_source_combos[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.On, true);
        this.zone_source_combos[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, volume);
      }
    } else if (lastVol !== volume) {
      if (sourceOn !== 0) {
        this.zone_source_combos[zoneNum][sourceOn].getService(hap.Service.Lightbulb).updateCharacteristic(hap.Characteristic.Brightness, volume);
      }
    }
  }

  dbToCent(decibles: number): number {
    return Math.round((79 - decibles) / 79 * 100);
  }

  centToDb(percentage: number): number {
    return Math.round(79 - percentage / 100 * 79);
  }
}
