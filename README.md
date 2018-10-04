# homebridge-nuvo
This is a homebridge plugin for that allows serial control of nuvo whole home audio systems.
It is set up as a platform so it will do discovery of zones and soureces for you
Each zone source combo has its own switch and brightness.
This allows for siri control of your nuvo whole house audio system.

Sample Config:
```
"platforms":
    [
      {
      "platform": "nuvo-platform",
      "port": "/dev/tty.usbserial",
      "numZones": 8
    }
    ]
```
