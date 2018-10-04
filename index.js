
let platform = require("./platform");

module.exports = function (homebridge) {
   platform.setHomebridge(homebridge);

   homebridge.registerPlatform("homebridge-nuvo", "nuvo-platform", platform.nuvoPlatform);
};
