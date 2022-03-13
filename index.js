const axios = require('axios');
const Slimbot = require('slimbot');
const https = require("https");
require('dotenv').config()



const myorchaddress = process.env.MY_ORCHESTRATOR_ADDRESS
const umeerpcurl = process.env.UMEE_RPC_URL
const telegrambottoken = process.env.TELEGRAM_BOT_TOKEN
const telegramchaitid = process.env.TELEGRAM_CHAT_ID
const runintervalinmins = process.env.RUN_INTERVAL_IN_MINS
const heartbeatinterval = process.env.HEARTBEAT_INTERVAL_IN_MINS
const ethrpcendpoint = process.env.ETH_RPC_ENDPOINT

const syncrequestpayload = {"id": 1, "jsonrpc": "2.0", "method": "eth_syncing", "params": []};
const slimbot = new Slimbot(telegrambottoken);
const agent = new https.Agent({
    rejectUnauthorized: false
});


async function checknodestatus(...heartbeat) {
    const res = await axios.get(umeerpcurl + 'cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED',{ httpsAgent: agent })
    const validators = res.data.validators
    const reducedvalidators = validators.map(
        validator => ({
                'tokens':validator.tokens,
                'operator_address':validator.operator_address
        }))
        .sort((a, b) => parseFloat(b.tokens) - parseFloat(a.tokens))
        .slice(0,10);
    const delegateKeys = [];
    const orchAddr = [];
    const eventNonces = [];
    reducedvalidators.forEach((item) => {
        delegateKeys.push(axios.get(umeerpcurl + 'gravity/v1beta/query_delegate_keys_by_validator',{
                params: {
                    validator_address: item.operator_address
                },
                httpsAgent: agent
            }
        ));
    });

    await Promise.all(delegateKeys).then(res => {
        res.map(r => {
            orchAddr.push(axios.get(umeerpcurl + 'gravity/v1beta/oracle/eventnonce/' + r.data.orchestrator_address,{ httpsAgent: agent }));
        });
    }).then(() =>  Promise.all(orchAddr).then(res => {
        res.map(r => {
            eventNonces.push(r.data.event_nonce)
        });
    }));

    const mynodeeventnonceresp = await axios.get(umeerpcurl + 'gravity/v1beta/oracle/eventnonce/' + myorchaddress,{ httpsAgent: agent })
    const mynodeeventnonce  = mynodeeventnonceresp.data.event_nonce;
    let numbersGreaterThanMine = 0;
    const eventNoncesNumber = eventNonces.map(Number)
    eventNoncesNumber.map(n=> {if(n > Number(mynodeeventnonce)) numbersGreaterThanMine++;})

    const syncresponse = await axios.post(ethrpcendpoint, syncrequestpayload);
    const data = syncresponse.data;
    const mynodepercentage = (numbersGreaterThanMine/10 * 100);
    const maxeventnonce = Math.max(...eventNoncesNumber);



    let telegramalerttxt = "MyEventNonce==>" + mynodeeventnonce + "\n" + "MaxEventNonce==>"+maxeventnonce
        + "\n" + "Percentage of nodes greater than mine==>" +  mynodepercentage + "\n" + "ETH RPC node sync status==>" + data.result

    /** Trigger an emergency error if there are nodes with higher event nonce than mine or eth rpc status has gone to catch-up mode*/
    if(!heartbeat[0] && (mynodepercentage>0 || data.result === true)){
        console.log('error in the system. so triggering alert')
        slimbot.sendMessage(telegramchaitid, telegramalerttxt);
    }else{
        console.log('heartbeat alert')
        slimbot.sendMessage(telegramchaitid, telegramalerttxt);
    }



}

checknodestatus(true);
setInterval(checknodestatus, runintervalinmins * 60  * 1000,false);
setInterval(checknodestatus, heartbeatinterval * 60  * 1000,true);
