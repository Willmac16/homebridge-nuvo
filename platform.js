
let serial = require('./serial.js');
let accessory = require('./accessory.js');

let nuvoSpeaker = accessory.nuvoSpeaker

module.exports.setHomebridge = function (homebridge)
{
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   this.homebridge = homebridge;

   accessory.setHomebridge(homebridge, serial);
}

module.exports.nuvoPlatform = function (log, config) {
    this.log = log;
    module.exports.log = log;

    this.nuvoAccessories = {}

    // console.log(config.port + " Is the port");

    if (config.port)
    {
      module.exports.port = config.port;
   } else {
      module.exports.port = '/dev/tty.usbserial';
   }

    if (config.numZones)
    {
      module.exports.numZones = config.numZones;
      this.numZones = config.numZones;
    } else {
      module.exports.numZones = 8;
    }

    serial.setup(module.exports.port, module.exports.numZones);
}

// Called by homebridge to retrieve static list of nuvoAccessories.
module.exports.nuvoPlatform.prototype.accessories = function (callback)
{

   let accessoryList = []
   setTimeout(() => {
    this.log("Starting Scan for " + this.numZones + " zones.");
    for (i = 1; i <= this.numZones; i++)
    {
        console.log(serial);
      if (serial.zoneConfig[i])
      {
          if (serial.zoneConfig[i][1] == "ENABLE1")
          {
             for (j = 1; j <= 6; j++)
             {
                if (serial.sourceConfig[j])
                {
                if (serial.sourceConfig[j][1] == "ENABLE1")
                {
                   const speaker = new nuvoSpeaker(this, serial.zoneConfig[i], serial.sourceConfig[j], i, j)
                   accessoryList.push(speaker)
                }
                }
             }
          }
      }
    }
return callback(accessoryList)
}, 20000)
}
