let SerialPort = require('serialport')
let Readline = require('@serialport/parser-readline')

import {
  Logging
} from "homebridge";

export const MAX_SOURCES: number = 6;

export class NuvoSerial
{
    portPath: string;
    numZones: number;
    log: Logging;

    port: typeof SerialPort;
    parser: any;

    portRetryInterval: number;

    platform: any;

    constructor(log: Logging, portPath: string, numZones: number, portRetryInterval: number, platform: any)
    {
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

    openPort()
    {
        this.port.open((err: any) =>
        {
            if (err)
            {
                if (this.portRetryInterval > 0)
                {
                    this.log.info(`That serial port didn't open right now. I will try again in ${this.portRetryInterval/1000} second(s).`);
                    setTimeout(this.openPort.bind(this), this.portRetryInterval);
                }
                else
                {
                    this.log.error("That port does not seem to exist (or this process doesn't have access to it).");
                    this.log.error("Consider changing the port or adding a port retry interval in the config.json file for homebridge.");
                }
            }
            else
            {
                this.log.info("Port setup process seems to have worked. Yay!");
                this.parser = this.port.pipe(new Readline({ delimiter: '\r\n' }))

                this.startTimers();
            }
        });
    }

    //Zone functions
    zoneOn(zone: number)
    {
        this.port.write(`*Z${zone}ON\r`);
        this.log.debug(`*Z${zone}ON\r`);
    }

    zoneOff(zone: number)
    {
        this.port.write(`*Z${zone}OFF\r`);
        this.log.debug(`*Z${zone}OFF\r`);
    }

    zoneSource(zone: number, source: number)
    {
        this.port.write(`*Z${zone}SRC${source}\r`);
        this.log.debug(`*Z${zone}SRC${source}\r`);
    }

    zoneVolume(zone: number, volume: number)
    {
        this.port.write(`*Z${zone}VOL${volume}\r`);
        this.log.debug(`*Z${zone}VOL${volume}\r`);
    }

    zoneMuteOn(zone: number)
    {
        this.port.write(`*Z${zone}MUTEON\r`);
        this.log.debug(`*Z${zone}MUTEON\r`);

    }

    zoneMuteOff(zone: number)
    {
        this.port.write(`*Z${zone}MUTEOFF\r`);
        this.log.debug(`*Z${zone}MUTEOFF\r`);

    }

    allOff()
    {
        this.port.write(`*ALLOFF\r`);
        this.log.debug(`*ALLOFF\r`);
    }

    //config functions

    sourceConfigName(source: number, name: string)
    {
        this.port.write(`*SCFG${source}NAME\"${name}\"\r`);
        this.log.debug(`*SCFG${source}NAME\"${name}\"\r`);
    }

    sourceConfigNuvonet(source: number, nuvonet: any)
    {
        this.port.write(`*SCFG${source}NUVONET${nuvonet}\r`);
        this.log.debug(`*SCFG${source}NUVONET${nuvonet}\r`);
    }


    //Status functions
    zoneAskStatus(zone: number)
    {
        this.port.write(`*Z${zone}STATUS?\r`);
        this.log.debug(`*Z${zone}STATUS?\r`);
    }

    allZoneStatus()
    {
       for (var i = 1; i <= this.numZones; i++) {
          var delay = ((i)*50);
          setTimeout(this.zoneAskStatus.bind(this), delay, i);
       }
    }

    zoneAskConfig(zone: number)
    {
        this.port.write(`*ZCFG${zone}STATUS?\r`);
        this.log.debug(`*ZCFG${zone}STATUS?\r`);
    }

    allZoneConfig()
    {
       for (var i = 1; i <= this.numZones; i++) {
          var delay = ((i)*50);
          setTimeout(this.zoneAskConfig.bind(this), delay, i);
       }
    }

    sourceAskConfig(source: number)
    {
        this.port.write(`*SCFG${source}STATUS?\r`);
        this.log.debug(`*SCFG${source}STATUS?\r`);
    }

    allSourceConfig()
    {
       for (var i = 1; i <= MAX_SOURCES; i++) {
          var delay = ((i)*50);
          setTimeout(this.sourceAskConfig.bind(this), delay, i);
       }
    }


    statusCheck(seconds: number)
    {
       var interval = seconds * 1000;
       setInterval((log: Logging, allZoneStatus: Function) => {
          log.debug("I am checking every " + seconds + " seconds.");
          allZoneStatus();
      }, interval, this.log, this.allZoneStatus.bind(this));

    }

    listen(callback: (arg0: any) => any)
    {
       this.port.open(() =>
       {
          this.parser.on('data', function(data: string)
          {
             if (data.trim() !== '')
             {
                return callback(data);
             }
          });
       });
    }

    sort()
    {
       this.listen((data) =>
       {
          var parts = data.split(",")
          for (var zone=1; zone <= this.numZones; zone++)
          {
             if ("#Z"+zone === parts[0])
             {
                 this.platform.updateZone(zone, parts);
             }
             else if ("#ZCFG"+zone === parts[0])
             {
                this.platform.addZone(zone, parts);
             }
          }
          for (var source=1; source <= MAX_SOURCES; source++)
          {
             if ("#SCFG"+source === parts[0])
             {
                 this.platform.addSource(source, parts);
             }
          }

       });
    }

    startTimers()
    {
        this.log.debug("Starting the timers ");
        setTimeout(this.sort.bind(this), 1500);
        setTimeout(this.allSourceConfig.bind(this), 2000);
        setTimeout(this.allZoneConfig.bind(this), 3500);
        setTimeout(this.allZoneStatus.bind(this), 5000);
        this.statusCheck(300);
    }
}
