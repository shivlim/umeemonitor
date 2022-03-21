const Journalctl = require('journalctl');
//journalctl -u peggod  --since "1 minutes ago"
const journalctl = new Journalctl({'unit':'axelarmonitor','since':'1000 minutes ago'});
journalctl.on('event', (event) => {
    console.log("event")
});
