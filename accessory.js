let serial = require('./serial');

// console.log(serial);

module.exports.setHomebridge = function (homebridge, serial)
{
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   this.homebridge = homebridge;
   this.serial = serial;
}

module.exports.nuvoSpeaker = function (platform, zone, source, i, j) {
    this.platform = platform;
    this.log = this.platform.log;
    this.name = zone[2].substring(5, (zone[2].length-1)) + " " + source[2].substring(5, (source[2].length-1));
    this.zone = i;
    this.source = j;
    this.volume = {};
    this.mute = {};


}

module.exports.nuvoSpeaker.prototype = {

    identify: function (callback) {
        // this.log("Identify requested!");
        callback();
    },

    getServices: function ()
    {


      const lightService = new Service.Lightbulb(this.name);
         lightService
           .getCharacteristic(Characteristic.On)
           .on('get', this.getPowerState.bind(this))
           .on('set', this.setPowerState.bind(this));

         lightService
           .addCharacteristic(new Characteristic.Brightness())
           .on('get', this.getVolume.bind(this))
           .on('set', this.setVolume.bind(this));




      const informationService = new Service.AccessoryInformation();

        informationService
           .setCharacteristic(Characteristic.Manufacturer, "Will MacCormack")
           .setCharacteristic(Characteristic.Model, "Nuvo Speaker")
           .setCharacteristic(Characteristic.SerialNumber, "NVGC")
           .setCharacteristic(Characteristic.FirmwareRevision, "0.1.2");

        return [informationService, lightService];
    },
    getPowerState: function (callback)
    {
      // this.log("get power");
      if (serial.zoneStatus[this.zone][1] == "ON")
      {
         if (serial.zoneStatus[this.zone][2].substring(3) == this.source)
         {
           callback(null, true);
         } else {
           callback(null, false);
         }

      } else {
         callback(null, false);
      }

    },

    setPowerState: function (power, callback)
    {
      // this.log("set power " + power);
      if(power)
      {
         serial.zoneOn(this.zone);
         serial.zoneSource(this.zone, this.source);
      } else {
         serial.zoneOff(this.zone);
      }
      callback(undefined, power);
    },

    getVolume: function (callback)
    {
      // this.log("get vol" );

      if (serial.zoneStatus[this.zone][3])
      {
         vol = serial.zoneStatus[this.zone][3];

      } else {
         vol = "VOL79"

      }

      if (vol == "MUTE")
      {
         var volume = 0;
      } else {
         var vnum = (parseInt(vol.substring(3)));
         var volume = Math.round(((vnum*-1)+79)*(100/79));
      }
         callback(null, volume);

    },

    setVolume: function (volume, callback)
    {
      // this.log("set vol "+ volume);

      if (serial.zoneStatus[this.zone][1] == "OFF")
      {
         serial.zoneOn(this.zone);
      }

      if (volume == 100)
      {

         var vol = 59;
      } else {

         var vol = Math.round((volume*(79/100)-79)*-1);
      }
      serial.zoneVolume(this.zone, vol);
      callback(undefined, volume);
   }
};
