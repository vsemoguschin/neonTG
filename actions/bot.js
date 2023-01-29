const TelegramAPI = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramAPI(token, { polling: true });



module.exports = {bot}