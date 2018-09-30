const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const port = new SerialPort('/dev/tty.usbserial', {
   baudRate: 57600
});
const parser = port.pipe(new Readline({ delimiter: '\r\n' }))

var line = null;
zoneStatus = [];
var numberOfZones = 8;
for(i=0; i <= numberOfZones; i++)
   zoneStatus.push(i);

module.exports = {
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
}
};
//source functions


//config functions
function zoneConfigStatus(zone)
{
   read(`#ZCFG${zone}`);
   port.write(`*ZCFG${zone}STATUS?\r`);
   console.log(`*ZCFG${zone}STATUS?\r`);
}

function sourceConfigStatus(source)
{
   read(`#SCFG${source}`);
   port.write(`*SCFG${source}STATUS?\r`);
   console.log(`*SCFG${source}STATUS?\r`);
}

function sourceConfigName(source, name)
{
   read(`#SCFG${source}`);
   port.write(`*SCFG${source}NAME\"${name}\"\r`);
   console.log(`*SCFG${source}NAME\"${name}\"\r`);
}

function sourceConfigNuvonet(source, nuvonet)
{
   read(`#SCFG${source}`);
   port.write(`*SCFG${source}NUVONET${nuvonet}\r`);
   console.log(`*SCFG${source}NUVONET${nuvonet}\r`);
}


//Status functions
function zoneAskStatus(zone)
{
   port.write(`*Z${zone}STATUS?\r`);
   console.log(`*Z${zone}STATUS?\r`);
}

function askAllStatus()
{
   for (var i = 1; i <= numberOfZones; i++) {
      var delay = ((i)*50);
      setTimeout(zoneAskStatus, delay, i);
   }
   setTimeout (console.log, 1000, zoneStatus);
}

function statusCheck(seconds)
{
   var the_interval = seconds * 1000;
   setInterval(function() {
      console.log("I am checking every " + seconds + " seconds.");
      askAllStatus();
   }, the_interval);

}

function read ()
{
   port.open(function ()
   {
      parser.on('data', function(data)
      {
         console.log(data);
      });
   });
}

function listen (callback)
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
         if ("#Z"+i == parts[0].substring(0, 3))
         {
            zoneStatus[i] = parts;
            module.exports.zoneStatus = zoneStatus
         }
      }
   });
}


sort();
askAllStatus();
statusCheck(300);
