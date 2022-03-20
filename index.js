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
const govproposalinterval = process.env.NEW_GOV_PROPOSALS_INTERVAL_IN_MINS
const ethrpcendpoint = process.env.ETH_RPC_ENDPOINT
const TCP_CONNECT_TIMEOUT_IN_MS = 10000

const syncrequestpayload = {"id": 1, "jsonrpc": "2.0", "method": "eth_syncing", "params": []};
const slimbot = new Slimbot(telegrambottoken);
const agent = new https.Agent({
    rejectUnauthorized: false
});


let CURRENT_MAX_PROPOSAL_ID = 0;


async function checkfornewgovproposals(){
    const res = await axios.get(umeerpcurl + 'cosmos/gov/v1beta1/proposals?pagination.limit=500',{ httpsAgent: agent })
    const proposals = res.data.proposals;
    const proposals_ids = proposals.map(proposal => proposal.proposal_id).map(Number)
    const max_proposal_id = Math.max(...proposals_ids)

    //first time bootstrap
    if(CURRENT_MAX_PROPOSAL_ID===0){
        CURRENT_MAX_PROPOSAL_ID = max_proposal_id;
    }else if(max_proposal_id>CURRENT_MAX_PROPOSAL_ID){
        const newproposal = proposals.filter(proposal=> Number(proposal.proposal_id) === max_proposal_id)
        const title = newproposal[0].content.title;
        const votingendtime = newproposal[0].voting_end_time;
        const alertmsg = `New proposal with  *${title} with voting end time *${votingendtime} found`;
        console.log(alertmsg)
        slimbot.sendMessage(telegramchaitid, alertmsg,{parse_mode: 'MarkdownV2'});
        CURRENT_MAX_PROPOSAL_ID = max_proposal_id;
    }
}


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

    let source = axios.CancelToken.source();
    setTimeout(() => {
        source.cancel();
    }, TCP_CONNECT_TIMEOUT_IN_MS);

    const mynodeeventnonceresp = await axios.get(umeerpcurl + 'gravity/v1beta/oracle/eventnonce/' + myorchaddress,{ httpsAgent: agent })
    const mynodeeventnonce  = mynodeeventnonceresp.data.event_nonce;
    let numbersGreaterThanMine = 0;
    const eventNoncesNumber = eventNonces.map(Number)
    eventNoncesNumber.map(n=> {if(n > Number(mynodeeventnonce)) numbersGreaterThanMine++;})

    const syncresponse = await axios.post(ethrpcendpoint, syncrequestpayload,{cancelToken: source.token});
    const data = syncresponse.data;
    const mynodepercentage = (numbersGreaterThanMine/10 * 100);
    const maxeventnonce = Math.max(...eventNoncesNumber);
    let ethstatus=false;
    if(data.hasOwnProperty('result') && !data.result){
        ethstatus=true;
    }

    const alertmsg = `
                                __Event Nonce Status__
                                \`\`\`
                                       ETH RPC Node Sync Status: ${getlogo(ethstatus)}
                                       My validator EventNonce:                     ${mynodeeventnonce}
                                       MaxEventNonce among top-10 validators:       ${maxeventnonce}
                                       Percentage of validators greater than mine:  ${mynodepercentage}
                               
                                \`\`\`
                                `;

    /** Trigger an emergency error if there are nodes with higher event nonce than mine or eth rpc status has gone to catch-up mode*/
    if(!heartbeat[0] && (mynodepercentage>0 || !ethstatus)){
        console.log('error in the system. so triggering alert')
        slimbot.sendMessage(telegramchaitid,  alertmsg,{parse_mode: 'MarkdownV2'});
    }else if(heartbeat[0]){
        console.log('heartbeat alert')
        slimbot.sendMessage(telegramchaitid,  alertmsg,{parse_mode: 'MarkdownV2'});
    }



}

function getlogo(ethstatus) {
    if(ethstatus)
        return '✅';
    else return '❌';
}

checknodestatus(true);
checkfornewgovproposals();
setInterval(checknodestatus, runintervalinmins * 60  * 1000,false);
setInterval(checknodestatus, heartbeatinterval * 60  * 1000,true);
setInterval(checkfornewgovproposals,govproposalinterval * 60  * 1000);
