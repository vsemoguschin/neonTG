const {bot} = require('./bot');
const {botSendMessage} = require('./bot-actions');
const {cancelOption, managerMenu} = require('./keyboards');
const {clearChat} = require('./chat');
// const {managerListener} = require('./listeners')
// const {manager} = require('./roles');

// создание заказа и внесение в БД
const createOrder = async (userID) => {
    let messageHistory = [];
    const infoText = `Один блок питания - один заказ.
Если в заказе несколько вывесок с отдельными блоками, то необходимо выложить общее изображение заказа со всеми вывесками, но каждую отдельно.
Отправь изображение заказа`
    const newOrder = {
        manager_id: userID,
        manager_name: null,
        img_id: null,
        number: null,
        order_name: null,
        neon: null,
        dimer: null,
        description: null,
        file_id: null,
        deadline: null,
    }
    let orderPreview = {
        description: '',
    };
    //Кнопки димера
    const dimerbuttons = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: 'Без диммера' }],
                [{ text: 'Диммер кнопочный ДК' }],
                [{ text: 'Диммер пульт' }],
                [{ text: 'Диммер крутилка' }],
                [{ text: 'Отменить' }],
            ],
            resize_keyboard: true,
        })
    }

    const aboutDescription = `Отправь оставшуюся информацию
    1. Место вывода провода:(на словах или на картинке во вложении);
    2. Общая длина провода от вывески: (нужно понимать, что ставится акустический прозрачный провод до блока, после блока белый или черный провод с выключателем и вилкой (длина такого провода всегда идет 1,8 метра), так же можно сделать подключение сразу в 220 вольт без выключателя и вилки (тут уже длина по желанию). Можно указать просто: комплект «стандарт», это значит, что идет 1 метр акустического провода - блок питания и кабель с выключателем и вилкой.
    3. Отверстия: (Для окон или для стены. Для стены делаются отверстия в макете.
    4. Фурнитура: (тросик, дистанционные держатели или просто саморезы с дюбелями)
    5. Коментарии и пояснения(если требуется)`
        let prev = 0;
    try {
        const botMsg = botSendMessage(userID, infoText, cancelOption);
        botMsg.then(msg => messageHistory.push(msg.message_id));
        bot.on('message', async function dataListener(msg) {
            const chatId = msg.chat.id;
            newOrder.manager_name = msg.from.username;
            if (chatId == userID) {
                const userMsg = msg.message_id;
                // Получение изображения
                if (newOrder.img_id == null && msg.text !== 'Отменить') {
                    if (!!msg.photo) {
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        prev = msg.message_id;
                        const HDPhoto = msg.photo.length - 1;
                        newOrder.img_id = msg.photo[HDPhoto].file_id;
                        bot.deleteMessage(userID, userMsg);
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI('Изображение загружено!\nОтправь Номер сделки/Телефон:'), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return;
                    } else {
                        await clearChat(userID, messageHistory);
                        messageHistory = [];
                        bot.deleteMessage(userID, userMsg)
                        const botMsg = botSendMessage(userID, `Отправь изображение заказа. Быстрая отправка. В формате .jpg`, cancelOption);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return;
                    };
                }
                // Получение номера сделки или номера телефона
                if (newOrder.number == null && msg.text !== 'Отменить') {
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    newOrder.number = msg.text;
                    orderPreview.description = `<b>Менеджер:</b> <a href="tg://user?id=${newOrder.manager_id}">${newOrder.manager_name}</a>\n<b>Номер сделки:</b> <i>${newOrder.number}</i>\n`;
                    messageHistory = [];
                    // bot.editMessageMedia({ type: 'photo', media: newOrder.img_id, caption: orderPreview.description }, { chat_id: userID, message_id: prev })

                    const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Отправь название заказа(называй осмыслено!)'), cancelOption);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                }
                // Получение названия заказа
                if (newOrder.order_name == null && msg.text !== 'Отменить') {
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    newOrder.order_name = msg.text;
                    orderPreview.description += `<b>Название заказа:</b> <i>${newOrder.order_name}</i>\n`;
                    const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + aboutNeonCodes), cancelOption);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                }
                // получение информации о неоне
                if (newOrder.neon == null && msg.text !== 'Отменить') {
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    const neonInfo = await neonCalc(msg.text);
                    bot.deleteMessage(userID, userMsg);
                    if (neonInfo !== undefined) {
                        orderPreview.description += '<b>Неон:</b> ' + neonInfo.neon.join(', ') + '\n<b>Блок:</b>' + neonInfo.power + 'W';
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Отправь информацию про димер\nДиммер кнопочный ДК - до 3х метров \nДиммер пульт - от 3х метров до 15 \nДиммер крутилка от 3х метров до 15'), dimerbuttons);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        newOrder.neon = msg.text;
                        newOrder.power = neonInfo.power;
                        return
                    } else {
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\nНе получилось\n' + aboutNeonCodes), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    }

                };
                // Получение информации о димере
                if (newOrder.dimer == null && msg.text !== 'Отменить') {
                    if (
                        msg.text == 'Без диммера' ||
                        msg.text == 'Диммер кнопочный ДК' ||
                        msg.text == 'Диммер пульт' ||
                        msg.text == 'Диммер крутилка'
                    ) {
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        newOrder.dimer = msg.text;
                        orderPreview.description += `\n<b>Диммер:</b> <i>${newOrder.dimer}</i>\n`;
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + aboutDescription), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        await clearChat(userID, messageHistory);
                        messageHistory = [];
                        bot.deleteMessage(userID, userMsg)
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\nИспользуй кнопки для выбора\n'), dimerbuttons);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    };
                };
                // Получение остальной информации
                if (newOrder.description == null && msg.text !== 'Отменить') {
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    newOrder.description = msg.text;
                    orderPreview.description += `<b>Описание заказа:</b> <i>${newOrder.description}</i>\n`;
                    const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Укажи через сколько дней готовность! Где 0 это сегодня, 1 - завтра и т.д.'), cancelOption);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                }
                // Получение информации о готовности заказа
                if (newOrder.deadline == null && msg.text !== 'Отменить') {
                    if (!isNaN(msg.text)) {
                        const today = new Date(msg.date * 1000);
                        newOrder.deadline = Math.round(today.setDate(today.getDate() + +msg.text) / 1000);
                        // newOrder.deadline = today.setDate(today.getDate() + +msg.text);
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        orderPreview.description += `<b>Готовность:</b> <i>${new Date(newOrder.deadline * 1000).getDate()}.${new Date(newOrder.deadline * 1000).getMonth() + 1}</i>\n`;
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Скинь файл(.cdr)'), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        await clearChat(userID, messageHistory);
                        messageHistory = [];
                        bot.deleteMessage(userID, userMsg)
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\nНеобходимо прислать просто цифру\nГде 0 это сегодня, 1 - завтра и т.д.'), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                }
                if (newOrder.file_id == null && msg.text !== 'Отменить') {
                    if (!!msg.document) {
                        if (isCDRfile(msg.document.file_name)) {
                            messageHistory.push(msg.message_id);
                            newOrder.file_id = msg.document.file_id;
                            const botMsg = botSendMessage(userID, `Файл загружен!\nЗаказ создан!`, managerMenu);
                            botMsg.then(msg => messageHistory.push(msg.message_id));
                            const order = await Order.create(newOrder);
                            manager(userID, messageHistory)
                            return bot.removeListener('message', dataListener);
                        } else {
                            const botMsg = botSendMessage(userID, `Кажется файл не того формата`, cancelOption);
                            botMsg.then(msg => messageHistory.push(msg.message_id));
                            return
                        }
                    } else {
                        bot.deleteMessage(userID, userMsg);
                        const botMsg = botSendMessage(userID, `Необходимо прислать файл .cdr`, cancelOption);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                }

                if (msg.text === 'Отменить') {
                    bot.deleteMessage(userID, userMsg);
                    await clearChat(userID, messageHistory);
                    messageHistory = [0]
                    const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
                    botMsg.then(msg => messageHistory.push(msg.message_id));
                    bot.removeListener('message', dataListener);
                    
                    return messageHistory[0];
                }
            }
        })
    } catch (e) {
        return console.log(e)
    }
}

module.exports = {createOrder}