const {bot} = require('./bot');

//очистить чат(Доработать, чтобы без ошибок)
const clearChat = async (chatId, messages) => {
    messages.forEach(msg => {
        return bot.deleteMessage(chatId, msg);
    });
}

module.exports = {clearChat}