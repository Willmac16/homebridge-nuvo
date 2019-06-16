var chromecasts = require('chromecasts')()

chromecasts.on('update', function (player) {
  console.log('all players: ', chromecasts.players[0]);
  chromecasts.players[0].status(function (err, status) {
        if (err) console.log("Eror")
        if (!status) console.log("No status")
        console.log(status)
      })
})