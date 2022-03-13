# umee network monitor
Simple tool to check event nonce of validator and compare it wioth opther validators event nonce and raise an alert(right now its telegram)

Also looks at sync status of eth rpc node and raises an alert.

Features
- Picks top-10 validator nodes by voting power and checks the latest event nonce
- Checks for sync status of eth rpc node
- All requests are done in a concurrent way so as to get quick response
- Heartbeat alert in telegram(configurable in minutes)
- Error alert in telegram if there are nodes with higher event nonce than yours or eth rpc status has gone to catch-up mode.

# Prerequisites

- Install nodejs and npm using nvm 
  **`nvm use 16`**
- Obtain telegram bot id and chat id using steps below

1. To create a free **Telegram account**, download the [app for Android / iPhone](https://telegram.org) and sign up using your phone number.
2. To create a **Telegram bot**, add [@BotFather](https://telegram.me/BotFather) on Telegram, press Start, and follow the below steps:
    1. Send a `/newbot` command and fill in the requested details, including a bot name and username.
    2. Take a note of the API token, which looks something like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`.
    3. Access the link `t.me/<username>` to your new bot given by BotFather and press Start.
    4. Access the link `api.telegram.org/bot<token>/getUpdates`, replacing `<token>` with the bot's API token. This gives a list of the bot's activity, including messages sent to the bot.
    5. The result section should contain at least one message, due to us pressing the Start button. If not, sending a `/start` command to the bot should do the trick. Take a note of the `"id"` number in the `"chat"` section of this message.
    6. One bot is enough for now, but you can repeat these steps to create more bots.

**At the end, you should have:**
1. A Telegram account
2. A Telegram bot *(at least one)*
3. The Telegram bot's API token *(at least one)*
4. The chat ID of your chat with the bot *(at least one)*

# Configuration
1. MY_ORCHESTRATOR_ADDRESS="this is your orchestrator wallet address starting with umee1"
2. UMEE_RPC_URL="https://api.blue.main.network.umee.cc/"
3. TELEGRAM_BOT_TOKEN="Telegram bot token from above step"
4. TELEGRAM_CHAT_ID="Telegram chat id from above step"
5. RUN_INTERVAL_IN_MINS="Frequency of running the bot in mins. Ex: 10"
6. HEARTBEAT_INTERVAL_IN_MINS="Frequency of running the heartbeat flow in mins. Ex: 10"
7. ETH_RPC_ENDPOINT="eth rpc endpoint. Ex: http://x.x.x.x:8545"


# Running
Run using tools like screen,tmux or create a service file if you prefer that.
After that run the following commands
- `npm install`
- `node index.js`
