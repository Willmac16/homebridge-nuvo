
const request = require("request");
var accessory = require("./accessory");



module.exports = function (homebridge) {
   accessory.setHomebridge(homebridge);
   homebridge.registerAccessory("homebridge-nuvo", "nuvo-serial", accessory.nuvoSerial);
};
