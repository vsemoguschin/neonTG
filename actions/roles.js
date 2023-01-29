const {bot} = require('./bot');
const {botSendMessage} = require('./bot-actions');
const {managerMenu} = require('./keyboards');
const {createOrder} = require('./user-actions');
const {clearChat} = require('./chat');
const {managerListener} = require('./listeners')


//Функции менеджера
const manager = async (userID, lastMsg = []) => {
    let messageHistory = lastMsg;
    const botMsg = botSendMessage(userID, 'Меню менеджера', managerMenu);
    botMsg.then(msg => messageHistory.push(msg.message_id));
    try {
        bot.on('callback_query', async function (msg) {
            console.log(msg);
        })
        bot.on('message', managerListener)
    } catch (e) {
        console.log(e)
    }
}

module.exports = {manager}