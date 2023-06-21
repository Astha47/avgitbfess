const express = require('express');
const CronJob = require('cron').CronJob;
const app = express();
require('dotenv').config();
const { AsthaFess } = require('./AsthaFess');

const PORT = 3000;

const bot = new AsthaFess({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    triggerword: ['medioker!', 'itb!', 'bucin!', 'help!', 'trade!'],
    blacklist: ['STEI-K','K','Komputasi', 'stei-k', 'stei-komputasi','steik','STEIK']
})

const job = new CronJob(
    '0 */3 * * * *',
    doJob,
    null,
    true,

);

async function doJob () {
    let tempMessage;
    try {
        const authenticatedUserId = await bot.getadminuserinfo();
        const message = await bot.getDirectMessage(authenticatedUserId);
        if (message.id) {
            //console.log(JSON.stringify(message, null, 2), 'Dapet nichhh <<<<<<<')
            tempMessage = message;
            await bot.tweetMessage(message);
            const response = await bot.deleteMessage(message);
        } else {
            console.log('no tweet to post!')
        }
    } catch (error) {
        console.log(error);
        console.log('======================ERROR=====================')
        if(tempMessage.id) {
            await bot.deleteMessage(tempMessage);
        }
        
    }
}

app.get('/', (req, res) => {
    res.send('AsthaFess still Online!')
})

app.get('/trigger',async (req, res, next) => {
    job.fireOnTick();
    res.send('job triggered!');
})
  
app.listen(PORT, () => {
    console.log(`AsthaFess app listening on port ${PORT}`)
})