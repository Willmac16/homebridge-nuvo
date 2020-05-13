
let platform = require('./platform');
let SerialPort = require('serialport')
let Readline = require('@serialport/parser-readline')
let port
let parser
var numberOfZones

zoneStatus = [];
zoneConfig = [];
sourceConfig = [];


module.exports = {
    setup: function(portPath, numZones)
    {
        port = new SerialPort(portPath, {
           baudRate: 57600
        }, false); // this is the openImmediately flag [default is true]

        port.on('error', function(err) {
            platform.log("That port does not seem to exist (or this process doesn't have access to it). Consider changing it in the config.json file for homebridge.");
        });

        port.on('open', function(err) {
            parser = port.pipe(new Readline({ delimiter: '\r\n' }))

            numberOfZones = numZones

            for(i=0; i <= numberOfZones; i++)
               zoneStatus.push(i);
            for(i=0; i <= numberOfZones; i++)
               zoneConfig.push(i);
            for(i=0; i <= 6; i++)
               sourceConfig.push(i);

            startTimers();

            platform.log("Port setup process seems to have worked. Yay!");
        });
    },

    //Zone functions
    zoneOn: function (zone)
    {
        port.write(`*Z${zone}ON\r`);
        console.log(`*Z${zone}ON\r`);
    },

    zoneOff: function (zone)
    {

        port.write(`*Z${zone}OFF\r`);
        console.log(`*Z${zone}OFF\r`);
    },

    zoneSource: function (zone, source)
    {
        port.write(`*Z${zone}SRC${source}\r`);
        console.log(`*Z${zone}SRC${source}\r`);
    },

    zoneVolume: function (zone, volume)
    {
        port.write(`*Z${zone}VOL${volume}\r`);
        console.log(`*Z${zone}VOL${volume}\r`);
    },

    zoneMuteOn: function (zone)
    {
        port.write(`*Z${zone}MUTEON\r`);
        console.log(`*Z${zone}MUTEON\r`);

    },

    zoneMuteOff: function (zone)
    {
        port.write(`*Z${zone}MUTEOFF\r`);
        console.log(`*Z${zone}MUTEOFF\r`);

    },

    allOff: function ()
    {
        port.write(`*ALLOFF\r`);
        console.log(`*ALLOFF\r`);
    },

};

//source functions


//config functions

function sourceConfigName(source, name)
{
    port.write(`*SCFG${source}NAME\"${name}\"\r`);
    console.log(`*SCFG${source}NAME\"${name}\"\r`);
}

function sourceConfigNuvonet(source, nuvonet)
{
    port.write(`*SCFG${source}NUVONET${nuvonet}\r`);
    console.log(`*SCFG${source}NUVONET${nuvonet}\r`);
}


//Status functions
function zoneAskStatus(zone)
{
    port.write(`*Z${zone}STATUS?\r`);
    console.log(`*Z${zone}STATUS?\r`);
}

function allZoneStatus()
{
   for (var i = 1; i <= numberOfZones; i++) {
      var delay = ((i)*50);
      setTimeout(zoneAskStatus, delay, i);
   }
   // setTimeout (console.log, 1000, zoneStatus);
}

function zoneAskConfig(zone)
{
    port.write(`*ZCFG${zone}STATUS?\r`);
    console.log(`*ZCFG${zone}STATUS?\r`);
}

function allZoneConfig()
{
   for (var i = 1; i <= numberOfZones; i++) {
      var delay = ((i)*50);
      setTimeout(zoneAskConfig, delay, i);
   }
   // setTimeout (console.log, 1000, zoneConfig);
}

function sourceAskConfig(source)
{
    port.write(`*SCFG${source}STATUS?\r`);
    console.log(`*SCFG${source}STATUS?\r`);
}

function allSourceConfig()
{
   for (var i = 1; i <= 6; i++) {
      var delay = ((i)*50);
      setTimeout(sourceAskConfig, delay, i);
   }
   // setTimeout (console.log, 1000, sourceConfig);
}


function statusCheck(seconds)
{
   var the_interval = seconds * 1000;
   setInterval(function() {
      console.log("I am checking every " + seconds + " seconds.");
      allZoneStatus();
   }, the_interval);

}

// function read()
// {
//    port.open(function ()
//    {
//       parser.on('data', function(data)
//       {
//          console.log(data);
//       });
//    });
// }

function listen(callback)
{
   port.open(function ()
   {
      parser.on('data', function(data)
      {
         if (data.trim() !== '')
         {
            return callback(data);
         }
      });
   });
}

function sort()
{
   listen(function(data)
   {
      var parts = data.split(",")
      for(i=1; i <= numberOfZones; i++)
      {
         if ("#Z"+i == parts[0])
         {
            zoneStatus[i] = parts;
            module.exports.zoneStatus = zoneStatus
         } else if ("#ZCFG"+i == parts[0])
         {
            zoneConfig[i] = parts;
            //platform.setZoneConfig(zoneConfig);

            module.exports.zoneConfig = zoneConfig
         }
      }
      for(i=1; i <= 6; i++)
      {
         if ("#SCFG"+i == parts[0])
         {
            sourceConfig[i] = parts;
            //platform.setSourceConfig(sourceConfig);
            module.exports.sourceConfig = sourceConfig
         }
      }

   });
}



// setTimeout(setup, 1000);
function startTimers()
{

    console.log("Starting the timers ");
    setTimeout(sort, 1500);
    setTimeout(allSourceConfig, 2000);
    setTimeout(allZoneConfig, 3500);
    setTimeout(allZoneStatus, 5000);
    setTimeout(allSourceConfig, 6000);
    setTimeout(allZoneConfig, 7000);
    statusCheck(300);
}
