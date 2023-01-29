const token = process.env.TOKEN;
const https = require("https");


// Отправка сообщения ботом
async function botSendMessage(chatId, msgText, forms) {
    msgText = encodeURI(msgText);
    let path = `/bot${token}/sendMessage?chat_id=${chatId}&text=${msgText}`;
    if (forms !== undefined) {
        forms = encodeURI(forms.reply_markup);
        path += `&reply_markup=${forms}`;
    }
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: path,
        method: 'GET'
    };
    const httpGet = async (url) => {
        return new Promise((resolve, reject) => {
            https.get(url, res => {
                res.setEncoding('utf8');
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const { message_id } = JSON.parse(body).result;
                    resolve({ message_id })
                });
            }).on('error', reject);
        });
    };
    return httpGet(options);
}

module.exports = {botSendMessage}