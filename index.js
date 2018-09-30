
let Service, Characteristic;
const request = require("request");
var serial = require("./serial")

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-nuvo", "nuvo-serial", nuvoSerial);
};

function nuvoSerial(log, config) {
    this.log = log;
    this.name = config.name;
    this.volume = {};
    this.mute = {};
}

nuvoSerial.prototype = {

    identify: function (callback) {
        this.log("Identify requested!");
        callback();
    },

    getServices: function ()
    {
        this.log("Creating speaker!");
        const speakerService = new Service.Speaker(this.name);


         this.log("... adding on characteristic");
         speakerService
            .addCharacteristic(new Characteristic.On())
            .on("get", this.getPowerState.bind(this))
            .on("set", this.setPowerState.bind(this));

         this.log("... configuring mute characteristic");
          speakerService
            .getCharacteristic(Characteristic.Mute)
            .on("get", this.getMuteState.bind(this))
            .on("set", this.setMuteState.bind(this));


        this.log("... adding volume characteristic");
        speakerService
            .addCharacteristic(new Characteristic.Volume())
            .on("get", this.getVolume.bind(this))
            .on("set", this.setVolume.bind(this));

        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Will MacCormack")
            .setCharacteristic(Characteristic.Model, "Nuvo Speaker")
            .setCharacteristic(Characteristic.SerialNumber, "NVGC11")
            .setCharacteristic(Characteristic.FirmwareRevision, "0.1.1");

        return [informationService, speakerService];
    },
    getMuteState: function (callback)
    {
      this.log("get mute");
      if (serial.zoneStatus[4][3].substring(3))
      {
         vol = serial.zoneStatus[4][3].substring(3)
      } else {
         vol = 0
      }

      if (vol = "MUTE")
      {
         callback(null, true);
      } else {
         vcallback(null, false);
      }
    },

    setMuteState: function (muted, callback)
    {
      this.log("set mute " + muted);
      if (muted)
      {
         serial.zoneMuteOn(4);
      } else {
         serial.zoneMuteOff(4);
      }
      callback(undefined, muted);
    },


    getPowerState: function (callback)
    {
      this.log("get power");
      if (serial.zoneStatus[4][0] == "ON")
      {
         callback(null, true);
      } else {
         callback(null, false);
      }

    },

    setPowerState: function (power, callback)
    {
      this.log("set power " + power);
      if(power)
      {
         serial.zoneOn(4);
      } else {
         serial.zoneOff(4);
      }
      callback(undefined, power);
    },

    getVolume: function (callback)
    {
      this.log("get vol" );
      if (serial.zoneStatus[4][3].substring(3))
      {
         vol = serial.zoneStatus[4][3].substring(3)
      } else {
         vol = 0
      }

      if (vol = "MUTE")
      {
         var volume = 0;
      } else {
         var volume = Math.round((vol*-1)+79*(100/79))
      }
         callback(null, volume);

    },

    setVolume: function (volume, callback) {
      this.log("set vol "+ volume);
      var vol = Math.round((volume*(79/100)-79)*-1);
      serial.zoneVolume(4, vol);
      callback(undefined, volume);
    }

};
