[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
# homebridge-nuvo
This is a homebridge plugin for that allows serial control of nuvo whole home audio systems.
It is set up as a platform so it will do discovery of zones and sources for you
Each zone source combo has its own switch and brightness.
This allows for siri control of your nuvo whole house audio system.

## Sample Config:
```
"platforms":
    [
      {
      "platform": "nuvo-platform",
      "port": "/dev/tty.usbserial",
      "numZones": 8,
      "powerOnVolume": 50,
      "portRetryInterval": 120
    }
    ]
```
### Options:
`port` sets the path to the nuvo.
If you are using a usb to rs232 adapter cable with a pl2303 or something similar, then run the command ```dmesg | grep -i usb``` and find a line like ```usb 3-2: pl2303 converter now attached to ttyUSB0```. The now attached to ????? should go into the config like ```"port": "/dev/?????"```.

`numZones` lets you set the number of zones that your amplifier supports for zone detection purposes. If you have disabled zones, set numZones to the number of the highest enabled zone (e.g. zones 1, 4, & 6 are enabled so numZones = 6)

`powerOnVolume` sets the volume that a zone will go to when turned on by the plugin.
Because of the way that the home app works (i.e. sending a 100% brightness command when told to turn on a "light"), this plugin will override any homekit requests to set a zone to 100% with this value

`portRetryInterval` is the number of seconds to wait before retrying the serialport. If set to 0 or not set at all, it will not retry the connection.

## nuvo-config (optional)
`nuvo-config` is an optional config tool installed with the plugin for configuration of the Nuvo Grand Concerto without using the Windows GUI. Run `nuvo-config <path_to_port>` or `sudo nuvo-config <path_to_port>` (depending on permissions) while homebridge is not running, and inside the config window run commands to tweak configuration (e.g. `zone 5 enable name "Best Zone" bass 4 treble -2 balance 6`).
