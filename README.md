[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
# homebridge-nuvo
This is a homebridge plugin for that allows serial control of nuvo whole home audio systems.
It is set up as a platform so it will do discovery of zones and sources for you
Each zone source combo has its own switch and brightness.
This allows for siri control of your nuvo whole house audio system.
One thing of note is that 100 Volume is not enabled (it sets it to 24%) so that when the home app turns a zone on, it will not blast music at you at full volume.

## Sample Config:
```
"platforms":
    [
      {
      "platform": "nuvo-platform",
      "port": "/dev/tty.usbserial",
      "numZones": 8,
      "portRetryInterval": 120
    }
    ]
```
### Options:
The port option is for you to set the path to the nuvo.
If you are using a usb to rs232 adapter cable with a pl2303 or something similar, then run the command ```dmesg | grep -i usb``` and find a line like ```usb 3-2: pl2303 converter now attached to ttyUSB0```. The now attached to ????? should go into the config like ```"port": "/dev/?????"```.

The numZones option if for you to set the number of zones that your amplifier supports for zone detection purposes.

The portRetryInterval option is the number of seconds to wait before retrying the serialport. If set to 0 or not set at all, it will not retry the connection.

## nuvo-config (optional)
`nuvo-config` is an optional config tool installed with the plugin for configuration of the Nuvo Grand Concerto without using the Windows GUI.
