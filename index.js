require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const { Op } = require('sequelize')
const models = require('./models/models');
const TelegramAPI = require('node-telegram-bot-api');
const { Order } = require('./models/models');
const { sync } = require('./db');
const { text } = require('express');
const https = require("https");
const request = require('request');
const { resolve } = require('path');
const { rejects } = require('assert');
const { measureMemory } = require('vm');
const { on } = require('events');
// const webApp = window.Telegram.WebApp; 

// const PORT = process.env.PORT || 5000;
const app = express();
const token = process.env.TOKEN;
const serverID = -1001796968322;

const bot = new TelegramAPI(token, { polling: true });

const users = {
    managers: [
        // { id: 317401874, }
    ],
    masters: [
        { id: 317401874, },
    ]
    // max: 368152093,
}

//Команды бота
// bot.setMyCommands([
//     { command: '/start', description: 'menu' }
// ]);

const keyboards = {
    //Кнопка отмены
    cancelOption: {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: 'Отменить' }],
            ],
            resize_keyboard: true,
            hide_keyboard: true
        })
    },
    //Меню менеджера
    managerMenu : {
        reply_markup: JSON.stringify(
            {
                keyboard: [
                    [{ text: 'Создать заказ' }],
                    [{ text: 'Все заказы' }, { text: 'Мои заказы' }],
                    [{ text: 'Склад' }],
                ],
                resize_keyboard: true,
                hide_keyboard: true
            }
        )
    },
    //Меню менеджера
    masterMenu : {
        reply_markup: JSON.stringify(
            {
                keyboard: [
                    [{ text: 'Все заказы' }, { text: 'Мои заказы' }],
                ],
                resize_keyboard: true,
                hide_keyboard: true
            }
        )
    },
    //Опции при редактировании заказа
    editOptions: {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: 'Отменить' }, { text: 'Готово' }],
                // [{ text: 'Описание' }],
                // [{ text: 'Срок готовности' }],
                // [{ text: 'Название заказа' }],
                // [{ text: 'Номер сделки/телефон' }],
                // [{ text: 'Информацию о неоне' }],
                // [{ text: 'Информацию о диммере' }],
                [{ text: 'Удалить заказ' }],
            ],
        })
    }
}

const {managerMenu, masterMenu, cancelOption, editOptions} = keyboards;

// Инфо как првавильно присылать код
const aboutNeonCodes = `Отправь данные неона.
Пример 6к3.5.
Первое значение - толщина неона(6 или 8);
Второе значение - код цвета:
    к - красный,
    с - синий,
    з - зеленый,
    о - оранжевый,
    г - голубой,
    ж - жёлтый,
    р - розовый,
    б - берюзовый,
    х - холодный белый,
    т - тёплый белый.
Третье значение - длина неона(через точку и один знак после);
6к3.5 читается как неон 6мм красный 3.5 метра.
Если в заказе несколько цветов то через пробел описать способом выше
Например: 6к3.5 6с4.6
`


//https://api.telegram.org/bot5575099005:AAFREUhpqvo12MIMn-8OumJylxogNkEV1us/sendMessage?chat_id=317401874&text=Enter%20your%20text%20here&reply_markup=%7B%22keyboard%22:[[%7B%22text%22:%22Создать%20заказ%22%7D],[%7B%22text%22:%22Все%20заказы%22%7D],[%7B%22text%22:%22Мои%20заказы%22%7D],[%7B%22text%22:%22Назад%20в%20меню%22%7D]]%7D

const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        // users.managers.forEach(user => bot.sendMessage(user.id, 'Погнали!'));
        users.managers.forEach(user => manager(user.id));
        users.masters.forEach(user => master(user.id));
    } catch (e) {
        console.log(e);
    }
};

//Запуск бота
start();




//---------ROLES----------------//
//Функции менеджера
const manager = async (userID, lastMsg = []) => {
    let messageHistory = lastMsg;
    const botMsg = botSendMessage(userID, 'Меню', managerMenu);
    botMsg.then(msg => messageHistory.push(msg.message_id));
    try {
        bot.on('callback_query', async function (msg) {
            console.log(msg);
        })
        bot.on('message', async function managerListener(msg) {
            console.log(msg);
            const chatId = msg.chat.id;
            if (chatId == userID || msg.text != undefined) {
                const msgText = msg.text;
                const userMsg = msg.message_id;
                if (chatId == userID) {
                    if (msgText == 'Создать заказ') {
                        bot.removeListener('message', managerListener);
                        messageHistory.push(userMsg);
                        await createOrder(userID);
                        return clearChat(userID, messageHistory);
                    }
                    if (msgText == 'Все заказы') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        const shownOrders = findOrders(userID, { is_done: false });
                        shownOrders.then(async (orders) => {
                            // console.log(orders);
                            const botMsgs = orders.map(order => order.message_id)
                            messageHistory = botMsgs;
                            const botMsg = botSendMessage(userID, "Активные заказы", managerMenu);
                            botMsg.then(msg => {
                                messageHistory.push(msg.message_id);
                                manager(userID, messageHistory);
                            });
                        })
                        return bot.removeListener('message', managerListener);
                    }
                    if (msgText == 'Мои заказы') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        const shownOrders = findOrders(userID, { is_done: false });
                        shownOrders.then(async (orders) => {
                            const botMsgs = orders.map(order => order.message_id)
                            messageHistory = botMsgs;
                            const botMsg = botSendMessage(userID, "Твои активные заказы'😂", managerMenu);
                            botMsg.then(msg => {
                                messageHistory.push(msg.message_id);
                                manager(userID, messageHistory);
                            });
                        })
                        return bot.removeListener('message', managerListener);
                    }
                    // if (msgText.slice(0, 6) == '/send_') {
                    //     messageHistory.push(userMsg);
                    //     await clearChat(userID, messageHistory);
                    //     bot.removeListener('message', managerListener);
                    //     return await getDeliveryDatas(userID, +msgText.slice(6));
                    // } 
                    if(msgText == 'Склад'){
                        // sklad(userID)
                    }
                    if (msgText && msgText.slice(0, 6) == '/file_') {
                        let order = await Order.findAll({ where: { order_id: +msgText.slice(6) }, order: [['deadline', 'DESC']] });
                        if(order.length == 0){
                            const botMsg = botSendMessage(userID, `Нет файла!`, managerMenu);
                            botMsg.then(msg => messageHistory.push(msg.message_id));
                            return manager(userID, messageHistory)
                        };
                        bot.deleteMessage(userID, userMsg);
                        order = order[0].dataValues;
                        const file = botSendDocument(userID, order.file_id, encodeURI(order.order_name), managerMenu);
                        file.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                    if (msgText && msgText.slice(0, 6) == '/edit_') {
                        //Сделать проверку числа
                        bot.deleteMessage(userID, userMsg);
                        await clearChat(userID, messageHistory);
                        bot.removeListener('message', managerListener);
                        return await editOrder(userID, +msgText.slice(6));
                    }
                    if (msg.text === "/start") {
                        messageHistory.push(userMsg);
                        bot.removeListener('message', managerListener);
                        await bot.sendMessage(chatId, "Меню", managerMenu);
                        clearChat(userID, messageHistory);
                        return manager(userID)
                    }
                    if (msgText !== 'Все заказы' &&
                        msgText !== 'Создать заказ' &&
                        msgText !== 'Мои заказы') {
                        messageHistory.push(userMsg);
                        const botMsg = botSendMessage(chatId, "Используй команды клавиатуры для выбора", managerMenu);
                        botMsg.then(msg => messageHistory.push(msg.message_id))
                        // bot.deleteMessage(chatId, msg.message_id - 1);
                        // return bot.deleteMessage(chatId, msg.message_id);
                    }
                }
            }
        })
    } catch (e) {
        console.log(e)
    }
}
//Функции мастера
const master = async (userID, lastMsg = []) => {
    let messageHistory = lastMsg;
    const botMsg = botSendMessage(userID, 'Меню', masterMenu);
    botMsg.then(msg => messageHistory.push(msg.message_id));
    try {
        bot.on('message', async function mastererListener(msg) {
            console.log(msg);
            const chatId = msg.chat.id;
            if (chatId == userID || msg.text != undefined) {
                const msgText = msg.text;
                const userMsg = msg.message_id;
                if (chatId == userID) {
                    if (msgText == 'Все заказы') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        const shownOrders = findOrders(userID, { master_id: null }, 'master');
                        shownOrders.then(async (orders) => {
                            // console.log(orders);
                            const botMsgs = orders.map(order => order.message_id)
                            messageHistory = botMsgs;
                            const botMsg = botSendMessage(userID, "Активные заказы", masterMenu);
                            botMsg.then(msg => {
                                messageHistory.push(msg.message_id);
                                manager(userID, messageHistory);
                            });
                        })
                        return bot.removeListener('message', mastererListener);
                    }
                    if (msgText == 'Мои заказы') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        const shownOrders = findOrders(userID, { master_id: userID });
                        shownOrders.then(async (orders) => {
                            const botMsgs = orders.map(order => order.message_id)
                            messageHistory = botMsgs;
                            const botMsg = botSendMessage(userID, "Твои активные заказы", mastererListener);
                            botMsg.then(msg => {
                                messageHistory.push(msg.message_id);
                                manager(userID, messageHistory);
                            });
                        })
                        return bot.removeListener('message', mastererListener);
                    }
                    if (msgText && msgText.slice(0, 6) == '/take_') {
                        await Order.update(
                            { master: order_name,
                            },
                            { where: { order_id: order_id } }
                        );
                        return
                    }
                    if (msg.text === "/start") {
                        messageHistory.push(userMsg);
                        bot.removeListener('message', managerListener);
                        await bot.sendMessage(chatId, "Меню", managerMenu);
                        clearChat(userID, messageHistory);
                        return manager(userID)
                    }
                    if (msgText !== 'Все заказы' &&
                        msgText !== 'Создать заказ' &&
                        msgText !== 'Мои заказы') {
                        messageHistory.push(userMsg);
                        const botMsg = botSendMessage(chatId, "Используй команды клавиатуры для выбора", managerMenu);
                        botMsg.then(msg => messageHistory.push(msg.message_id))
                        // bot.deleteMessage(chatId, msg.message_id - 1);
                        // return bot.deleteMessage(chatId, msg.message_id);
                    }
                }
            }
        })
    } catch (e) {
        console.log(e)
    }
}


//--------USER_ACTIONS---------//
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
        elements: null,
    }
    let orderPreview = {
        description: '',
    };
    //Кнопки димера
    const dimerbuttons = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: 'Нет' }],
                [{ text: 'Кнопочный' }],
                [{ text: 'Пульт' }],
                [{ text: 'Крутилка' }],
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
    5. Коментарии и пояснения(если требуется)`;
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
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Отправь колличество элементов числом'), cancelOption);
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
                // Получение колличества элементов
                if (newOrder.elements == null && msg.text !== 'Отменить') {
                    if (!isNaN(msg.text)) {
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        newOrder.elements = msg.text;
                        orderPreview.description += `\n<b>Элементов:</b> <i>${newOrder.elements}</i>\n`;
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\n' + 'Отправь информацию про димер\nДиммер кнопочный ДК - до 3х метров \nДиммер пульт - от 3х метров до 15 \nДиммер крутилка от 3х метров до 15'), dimerbuttons);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        await clearChat(userID, messageHistory);
                        messageHistory = [];
                        bot.deleteMessage(userID, userMsg)
                        const preview = botSendPhoto(userID, newOrder.img_id, encodeURI(orderPreview.description + '\n\n\nНеобходимо прислать просто цифру'), cancelOption);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                }
                // Получение информации о димере
                if (newOrder.dimer == null && msg.text !== 'Отменить') {
                    if (
                        msg.text == 'Нет' ||
                        msg.text == 'Кнопочный' ||
                        msg.text == 'Пульт' ||
                        msg.text == 'Крутилка'
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
                    const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]));
                    await clearChat(userID, messageHistory);
                    return bot.removeListener('message', dataListener);
                }
            }
        })
    } catch (e) {
        return console.log(e)
    }
};

const editOrder = async (userID, order_id, lastMsg = []) => {
    //Добавить обновления доставки
    let messageHistory = lastMsg;
    try {
        let editingOrder = await Order.findAll({ where: { order_id: order_id }, order: [['deadline', 'DESC']] });
        if(editingOrder.length == 0){
            const botMsg = botSendMessage(userID, `Заказ не отредактировать!`, managerMenu);
            botMsg.then(msg => messageHistory.push(msg.message_id));
            return manager(userID, messageHistory)
        };
        editingOrder = editingOrder[0].dataValues;
        const orderCart = await createOrderCart(userID, editingOrder, 'edit');
        const infoText = 'Чтобы изменить изображение отправь новое изображение. Если макет - отправь файл\nЧтобы изменить остальные данные начни сообщение с ключегого слова и после новые данные. Например "Описание" и дальше новый текст.\nОтправь "Готово" если необходимые изменения внесены, "Отмена" - чтобы отменить\n<b>Внимание! Все данные перезаписываются а не дополняются!</b>'; 
        
        const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n' + infoText), editOptions);
        preview.then(msg => messageHistory.push(msg.message_id));
        
        bot.on('message', async function editListener(msg) {
            // console.log(messageHistory);
            let firstWord = '';
            if(!!msg.text){
                console.log(msg.text);
                firstWord = msg.text.split(' ')[0].toLowerCase();
            }
            const chatId = msg.chat.id;
            if (userID == chatId) { 
                const userMsg = msg.message_id;
                const msgText = msg.text;
                const id = order_id;
                //Обновление документа
                if (!!msg.document) {
                    if (isCDRfile(msg.document.file_name)) {
                        editingOrder.file_id = msg.document.file_id;
                        bot.deleteMessage(userID, userMsg);
                        const file = botSendDocument(userID, editingOrder.file_id, encodeURI('Файл обновлен!'), editOptions);
                        file.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                    else {
                        messageHistory.push(userMsg);
                        const botMsg = botSendMessage(userID, `Кажется файл не того формата`, editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                }
                //Обновление 
                if (!!msg.photo) {
                    await clearChat(userID, messageHistory);

                    messageHistory = [];
                    const HDPhoto = msg.photo.length - 1;
                    editingOrder.img_id = msg.photo[HDPhoto].file_id;
                    bot.deleteMessage(userID, userMsg);
                    const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                    const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Изображение изменено!</b>'), editOptions);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                };
                if(firstWord.slice(0,8)=='описание'){
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    editingOrder.description = msg.text.split(' ').slice(1).join(' ');
                    const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                    const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Описание изменено!</b>'), editOptions);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                };
                if(firstWord.slice(0,8)=='номер'){
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    editingOrder.number = msg.text.split(' ').slice(1).join(' ');
                    const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                    const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Номер сделки/заказа изменен!</b>'), editOptions);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                };
                if(firstWord.slice(0,8)=='название'){
                    bot.deleteMessage(userID, userMsg)
                    clearChat(userID, messageHistory);
                    messageHistory = [];
                    editingOrder.order_name = msg.text.split(' ').slice(1).join(' ');
                    const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                    const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Описание изменено!</b>'), editOptions);
                    preview.then(msg => messageHistory.push(msg.message_id));
                    return
                };
                if(firstWord.slice(0,8)=='элементы'){
                    if (!isNaN(msg.text.split(' ')[1])) {
                        editingOrder.elements = msg.text.split(' ')[1];
                        // newOrder.deadline = today.setDate(today.getDate() + +msg.text);
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                        const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Колличество элементов изменено!</b>'), editOptions);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        bot.deleteMessage(userID, userMsg)
                        const botMsg = botSendMessage(userID, 'Необходимо прислать просто цифру', editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                };
                if(firstWord.slice(0,10)=='готовность'){
                    if (!isNaN(msg.text.split(' ')[1])) {
                        const today = new Date(msg.date * 1000);
                        editingOrder.deadline = Math.round(today.setDate(today.getDate() + +msg.text.split(' ')[1]) / 1000);
                        // newOrder.deadline = today.setDate(today.getDate() + +msg.text);
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                        const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Дата обновлена!</b>'), editOptions);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        bot.deleteMessage(userID, userMsg)
                        const botMsg = botSendMessage(userID, 'Необходимо прислать просто цифру\nГде 0 это сегодня, 1 - завтра и т.д.', editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    }
                };
                if(firstWord.slice(0,4)=='неон'){
                    const neonInfo = await neonCalc(msg.text.split(' ').slice(1).join(' '));
                    bot.deleteMessage(userID, userMsg);
                    if (neonInfo !== undefined) {
                        editingOrder.neon = msg.text.split(' ').slice(1).join(' ');
                        editingOrder.power = neonInfo.power;
                        const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                        const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Данные неона обновлены!</b>'), editOptions);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        const botMsg = botSendMessage(userID, 'Что то неверно!\n\n\n' + aboutNeonCodes, editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    };
                };
                if(firstWord.slice(0,6)=='диммер'){
                    if (
                        msg.text.split(' ').slice(1).join(' ').toLowerCase() == 'нет' ||
                        msg.text.split(' ').slice(1).join(' ').toLowerCase() == 'кнопочный' ||
                        msg.text.split(' ').slice(1).join(' ').toLowerCase() == 'пульт' ||
                        msg.text.split(' ').slice(1).join(' ').toLowerCase() == 'крутилка'
                    ) {
                        bot.deleteMessage(userID, userMsg)
                        clearChat(userID, messageHistory);
                        messageHistory = [];
                        editingOrder.dimer = msg.text.split(' ')[1];
                        const orderCart = await createOrderCart(userID, editingOrder, 'edit');
                        const preview = botSendPhoto(userID, editingOrder.img_id, encodeURI(orderCart + '\n\n\n<b>Информация о диммере обновлена!</b>'), editOptions);
                        preview.then(msg => messageHistory.push(msg.message_id));
                        return
                    } else {
                        bot.deleteMessage(userID, userMsg)
                        const botMsg = botSendMessage(userID, 'Что то неверно!', {
                            reply_markup: JSON.stringify({
                                keyboard: [
                                    [{ text: 'Диммер Нет' }],
                                    [{ text: 'Диммер Кнопочный' }],
                                    [{ text: 'Диммер Пульт' }],
                                    [{ text: 'Диммер Крутилка' }],
                                    [{ text: 'Отменить' }, { text: 'Готово' }],
                                    [{ text: 'Удалить заказ' }],
                                ],
                                resize_keyboard: true,
                            })
                        });
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return
                    };
                };
                if (msgText === 'Отменить') {
                    bot.removeListener('message', editListener);
                    bot.deleteMessage(userID, userMsg);
                    const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]))
                    return await clearChat(userID, messageHistory);
                }
                if (msgText === '/start') {
                    bot.removeListener('message', editListener);
                    bot.deleteMessage(userID, userMsg);
                    const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]));
                    return await clearChat(userID, messageHistory);
                }
                if (msgText === 'Готово') {
                    bot.deleteMessage(userID, userMsg);
                        await Order.update(
                            { order_name: editingOrder.order_name,
                            deadline: editingOrder.deadline,
                            neon: editingOrder.neon,
                            file_id: editingOrder.file_id,
                            img_id: editingOrder.img_id,
                            number: editingOrder.number,
                            description: editingOrder.description,
                            power: editingOrder.power,
                            dimer: editingOrder.dimer,
                            elements: editingOrder.elements,
                            },
                            { where: { order_id: order_id } }
                        );
                    bot.removeListener('message', editListener);
                    await clearChat(userID, messageHistory);
                    const botMsg = botSendMessage(userID, 'Изменения обновлены', managerMenu);
                    const shownOrders = findOrders(userID, { order_id: id });
                    shownOrders.then(order => {
                        messageHistory = [order[0].message_id];
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return manager(userID, messageHistory);
                    });
                    return
                }
                else {
                    bot.deleteMessage(userID, userMsg);
                    const botMsg = botSendMessage(userID, 'Ничего не понятно!\n\n' + infoText, editOptions);
                    botMsg.then(msg => messageHistory.push(msg.message_id));
                    return
                }
                // if (msgText !== 'Отменить' &&
                //     msgText !== 'Готово' &&
                //     !msg.photo && !msg.document) {
                //     newDatas.description = msgText;
                //     bot.editMessageCaption(msgText, { chat_id: userID, message_id: previewOrderID });
                //     bot.deleteMessage(userID, userMsg)
                //     // messageHistory.push(userMsg);
                //     const botMsg = botSendMessage(userID, 'Описание обновлено!', editOptions);
                //     botMsg.then(msg => messageHistory.push(msg.message_id))
                // }
            }
        });
    } catch (e) {
        console.log(e);
    }
};

//-------BOT-ACTIONS----------//
//Отправка сообщения ботом
async function botSendMessage(chatId, msgText, forms) {
    msgText = encodeURI(msgText);
    let path = `/bot${token}/sendMessage?chat_id=${chatId}&text=${msgText}&parse_mode=html`;
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
//Отправка фото ботом
async function botSendPhoto(chatId, photo_id, caption, forms) {
    let path = `/bot${token}/sendPhoto?chat_id=${chatId}&photo=${photo_id}&caption=${caption}&parse_mode=html`;
    if (forms !== undefined) {
        forms = encodeURI(forms.reply_markup);
        path += `&reply_markup=${forms}`;
    }
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
                    const { message_id, caption } = JSON.parse(body).result;
                    resolve({ message_id, caption })
                });
            }).on('error', reject);
        });
    };
    return httpGet(options);
}
//Отправка документов ботом
// botSendDocument(317401874,'BQACAgIAAxkBAAJb82PGqUHQF3M0JA6AgGP7vt8miTGQAAIoJQAC-fU5SqhgJX9nbRyPLQQ', 'sdasa')
async function botSendDocument(chatId, file_id, caption, forms) {
    let path = `/bot${token}/sendDocument?chat_id=${chatId}&document=${file_id}&caption=${caption}&parse_mode=html`;
    if (forms !== undefined) {
        forms = encodeURI(forms.reply_markup);
        path += `&reply_markup=${forms}`;
    }
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
                    const { message_id, caption } = JSON.parse(body).result;
                    resolve({ message_id, caption })
                });
            }).on('error', reject);
        });
    };
    return httpGet(options);
}


//------ПРОВЕРКИ--------//
//Проверка отправленного кода
const neonCalc = async (code) => {
    let res = {
        neon: [],
        power: 0,
    }
    let colorCodes = {
        'к': 'красный',
        'с': 'синий',
        'з': 'зелёный',
        'о': 'оранжевый',
        'ж': 'желтый',
        'г': 'голубой',
        'р': 'розовый',
        'б': 'берюзовый',
        'х': 'холодный белый',
        'т': 'тёплый белый'
    };
    let codes = code.split(' ');
    for (let i = 0; i < codes.length; i++) {
        let neonWidth = codes[i][0];
        let colorCode = codes[i][1];
        let neonLength = codes[i].slice(2);
        if (neonWidth == '6' || neonWidth == '8') {
            res.neon.push(neonWidth + 'мм')
        } else return;
        if (colorCodes[colorCode]) {
            res.neon[i] += ' ' + colorCodes[colorCode]
        } else return;
        if (!isNaN(+neonLength) && +neonLength > 0) {
            res.neon[i] += ` длина ${neonLength * 1}м`;
            res.power += neonLength * 14
        } else return;
    }
    if (res.power < 24) {
        res.power = 24
        return res
    }
    if (res.power < 36 && res.power >= 24) {
        res.power = 36
        return res
    }
    if (res.power < 60 && res.power >= 36) {
        res.power = 60
        return res
    }
    if (res.power < 100 && res.power >= 60) {
        res.power = 100
        return res
    }
    if (res.power >= 100) {
        res.power = 150
        return res
    }
}
//проверка формата файла
const isCDRfile = (name) => {
    return name.slice(-4) === ".cdr"
}


//-------BD-ACTIONS----------//
//Показать заказы по заданным параметрам
const findOrders = async (chatId, parameters, cartOptions, change) => {
    //дать нормальные названия
    try {
        let datas = [];
        const foundOrders = await Order.findAll({ where: parameters, order: [['deadline', 'DESC']] });
        if (foundOrders.length == 0) {
            const botMsg = botSendMessage(chatId, "Тут пусто", managerMenu);
            return botMsg.then(msg => {
                return [msg];
            });
        }
        
        for (let order of foundOrders) {
            const orderCart = await createOrderCart(chatId, order, cartOptions, change);
            await botSendPhoto(chatId, order.img_id, encodeURI(orderCart))
            .then(data => {
                datas.push(data);
                // datas.push(order.dataValues);
                // console.log(datas);
            });
        };
        return datas
    } catch (e) {
        return console.log(e)
    }
}

//Прислать карточку заказа
const createOrderCart = async (chatId, order, cartOptions, change) => {
    // console.log(order.dataValues);
    // let realOrder = order.dataValues;
    if (change){
        order = Object.assign(order, change);
    }
    const { order_id, order_name, manager_id, manager_name, deadline, dimer, number, neon, elements, file_id, img_id, description, master_name, condition, delivery }= order;
    const neonInfo = await neonCalc(neon);
    let orderCaption = {
        mainDesc: `<ins>Готовность: ${new Date(deadline * 1000).getDate()}.${new Date(deadline * 1000).getMonth() + 1}</ins>;
<b>Название:</b> ${order_name};
<b>Менеджер:</b> <a href="tg://user?id=${manager_id}">${manager_name}</a>;
<b>Номер:</b> ${number};
<b>Неон:</b> ${neonInfo.neon.join(', ')};
<b>Элементов:</b> ${elements};
<b>Блок:</b> ${neonInfo.power}W;
<b>Диммер:</b> <i>${dimer}</i>
<b>Описание:</b> ${description}`,
        stage:
            `\n<b>Статус:</b> ${condition}`,
        actions: `\n/edit_${order_id} - <i>Изменить заказ</i>
/send_${order_id} - <i>Внести/Изменить данные для отправки</i>
/file_${order_id} - <i>Макет</i>`,
        // deliveryInfo: '\n<b>Отправить:</b> ' + delivery
        masterAction:`
/take_${order_id} - <i>Взять р работу</i>`
    }
    const { mainDesc, stage, actions, deliveryInfo, masterAction } = orderCaption;
    let orderText = ''
    if (cartOptions == 'edit') {
        orderText = mainDesc + stage + actions;
        orderText = mainDesc;
        // bot.sendDocument(chatId, file_id)
    } 
    if(cartOptions == 'master'){
        orderText = mainDesc + masterAction;
    }
    return orderText
}

//очистить чат(Доработать, чтобы без ошибок)
const clearChat = async (chatId, messages) => {
    messages.forEach(msg => {
        bot.deleteMessage(chatId, msg);
    });
    return [];
}

//Внести данные отправления
const getDeliveryDatas = async (userID, order_id, lastMsg = []) => {
    messageHistory = lastMsg;
    let deliveryData = '';
    try {
        const botMsg = botSendMessage(userID, 'Отправь данные для отправки и нажми "Готово"', editOptions);
        botMsg.then(msg => messageHistory.push(msg.message_id));
        bot.on('message', async function deliveryListener(msg) {
            const chatId = msg.chat.id;
            if (userID == chatId) {
                const userMsg = msg.message_id;
                const msgText = msg.text;
                const id = order_id;
                if (msgText == 'Отменить') {
                    bot.removeListener('message', deliveryListener);
                    messageHistory.push(userMsg);
                    const botMsg = botSendMessage(userID, 'Данные не внесены', managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]))
                    return await clearChat(userID, messageHistory);
                }
                if (msgText == 'Готово') {
                    messageHistory.push(userMsg);
                    if (deliveryData !== '') {
                        await Order.update(
                            { delivery: deliveryData },
                            { where: { order_id: id } });
                        bot.removeListener('message', deliveryListener);
                        await clearChat(userID, messageHistory);
                        const botMsg = botSendMessage(userID, 'Данные внесены', managerMenu);
                        const shownOrders = findOrders(userID, { order_id: id });
                        shownOrders.then(orders => {
                            const botMsgs = orders.map(order => order.message_id);
                            messageHistory = botMsgs;
                            botMsg.then(msg => messageHistory.push(msg.message_id));
                            return manager(userID, messageHistory);
                        })
                    } else {
                        const botMsg = botSendMessage(userID, 'Отправь данные и нажми "Готово".\nОтправь "Отмена", чтобы отменить', editOptions);
                        botMsg.then(msg => { messageHistory.push(msg.message_id) })
                    }
                }
                // if (msgText == '/start') {
                //     bot.removeListener('message', deliveryListener);
                //     messageHistory.push(userMsg);
                //     const botMsg = botSendMessage(userID, 'Данные не внесены', managerMenu);
                //     botMsg.then(msg => manager(userID, [msg.message_id]))
                //     return await clearChat(userID, messageHistory);
                // }
                if (msgText !== 'Отменить' &&
                    msgText !== 'Готово') {
                    deliveryData = msgText;
                    messageHistory.push(userMsg);
                    const botMsg = botSendMessage(userID, 'Данные Получены. Нажми готово или отмена. Или отправь ещё раз данные.', editOptions);
                    botMsg.then(msg => messageHistory.push(msg.message_id))
                }

            }
        })
    } catch (e) {
        return console.log(e)
    }
}

// удалить таблицу
//  sequelize.drop()
const statistic = async(userID, lastMsg = []) =>{

    const foundOrders = await Order.findAll({ where: {is_done:false}, order: [['deadline', 'DESC']] });
    // const res = foundOrders.map((el, i, array)=>{
    //         // console.log(el.dataValues.neon.split(' '));
    //         return el.dataValues.neon.split(' ');
    //         // if(el.dataValues.neon.slice(0,2)=='6к'){
    //         //     // console.log(el.dataValues.neon.slice(2,3));
    //         //     res += +el.dataValues.neon.slice(2,3);
    //         // }
    //     })
    //     .flat().filter((el,i)=>{
    //         return el.slice(0,2)=='6к'
    //     }).map((el, i, array)=>{
    //         return +el.slice(2);
    //     }).reduce(function(previousValue, currentValue, index, array) {
    //         return previousValue + currentValue;
    //       })
    let a = {
        neon:{},
        blocks:{}
    }
    const res = foundOrders.map((el, i, array)=>{
        a.items = array.length;
        // console.log(el.dataValues.power);
        return el.dataValues
    });

    res.map(el=>{
        let blok = el.power
        console.log(blok);
        if(!a.blocks.hasOwnProperty([blok])){
            a.blocks[blok] = 1;
        }
        else {
            a.blocks[blok] =  +a.blocks[blok] + 1;
        }
        })

        res.map(el=>{
            return el.neon.split(' ');
        }).flat()
        .map((el, i, array)=>{
                if(!a.neon.hasOwnProperty([el.slice(0,2)])){
                    a.neon[el.slice(0,2)] = +el.slice(2);
                }
                else {
                    a.neon[el.slice(0,2)]+= +el.slice(2)
                }
                return el
            })
            console.log(a);
            // console.log(neons);
            console.log(`Заказов в работе ${a.items}`);
            // console.log(`Заказов в работе ${a.items}`);
            // console.log(`Заказов в работе ${a.items}`);
}
statistic(317401874)


// {
//     reply_markup: JSON.stringify({
//         inline_keyboard: [
//             [
//                 { text: 'Изменить описание', switch_inline_query_current_chat: `edit_${order_id} - не удалять!\n${description}\n`,},
//             ],
//             [
//                 { text: 'Изменить/добавить данные отправки', switch_inline_query_current_chat: `\n(ht)${description}\n`,}
//             ],
//             [
//                 { text: 'Удалить заказ', switch_inline_query_current_chat: `\n(ht)${description}\n`,}
//             ],
//             [
//                 { text: 'Макет', switch_inline_query_current_chat: `\n(ht)${description}\n`,}
//             ],
//         ]
//     })
// }

// const editOrder2 = async (userID, order_id, lastMsg = []) => {
    //     let messageHistory = lastMsg;
    //     const infoText = 'Выбери то что необходимо изменить.\nЕсли это изображение то просто отправь изображение. Если макет - отправь файл\nОстальное выбери из списка клавиш.\nОтправь "Готово" если необходимые изменения внесены'
    //     let newDatas = {
    //         file_id: null,
    //         img_id: null,
    //         description: null,
    //         order_name: null,
    //         deadline: null,
    //         neon: null,
    //         dimmer: null,
    //     }
    //     //Опции при редактировании заказа
    //     const editOptions = {
    //         reply_markup: JSON.stringify({
    //             keyboard: [
    //                 [{ text: 'Номер сделки/телефон' }],
    //                 [{ text: 'Название заказа' }],
    //                 [{ text: 'Срок готовности' }],
    //                 [{ text: 'Информацию о неоне' }],
    //                 [{ text: 'Информацию о диммере' }],
    //                 [{ text: 'Описание' }],
    //                 [{ text: 'Готово' }],
    //                 [{ text: 'Отменить' }],
    //             ],
    //         })
    //     }
    //     const botMsg = botSendMessage(userID, infoText, editOptions);
    //     try {
    //         botMsg.then(msg => {
    //             messageHistory.push(msg.message_id);
    //         });
    //         const editingOrder = findOrders(userID, { order_id: order_id }, 'edit');
    //         let previewOrderID = 0;
    //         let oldDescription = '';
    //         editingOrder.then(order => {
    //             messageHistory.push(order[0].message_id);
    //             previewOrderID = order[0].message_id;
    //             newDatas.description = order[0].caption;
    //             oldDescription = order[0].caption;
    //         })
    //         bot.on('message', async function editListener(msg) {
    //             console.log(messageHistory);
    //             const chatId = msg.chat.id;
    //             if (userID == chatId) {
    //                 const userMsg = msg.message_id;
    //                 const msgText = msg.text;
    //                 const id = order_id;
    //                 if (!!msg.document) {
    //                     if (isCDRfile(msg.document.file_name)) {
    //                         newDatas.file_id = msg.document.file_id;
    //                         messageHistory.push(userMsg);
    //                         const botMsg = botSendMessage(userID, `Файл загружен!`, editOptions);
    //                         botMsg.then(msg => messageHistory.push(msg.message_id));
    //                     }
    //                     else {
    //                         messageHistory.push(userMsg);
    //                         const botMsg = botSendMessage(userID, `Кажется файл не того формата`, editOptions);
    //                         botMsg.then(msg => messageHistory.push(msg.message_id));
    //                     }
    //                 }
    //                 if (!!msg.photo) {
    //                     newDatas.img_id = msg.photo[3].file_id;
    //                     // messageHistory.push(userMsg); 
    //                     bot.deleteMessage(userID, userMsg)
    //                     bot.editMessageMedia({ type: 'photo', media: msg.photo[3].file_id, caption: newDatas.description }, { chat_id: userID, message_id: previewOrderID })
    //                     // const botMsg = botSendMessage(userID, `Изображение обновлено!`, editOptions);
    //                     // botMsg.then(msg => messageHistory.push(msg.message_id));
    //                 }
    //                 if (msgText === 'Отменить') {
    //                     bot.removeListener('message', editListener);
    //                     messageHistory.push(userMsg);
    //                     const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
    //                     botMsg.then(msg => manager(userID, [msg.message_id]))
    //                     return await clearChat(userID, messageHistory);
    //                 }
    //                 // if (msgText === '/start') {
    //                 //     bot.removeListener('message', editListener);
    //                 //     messageHistory.push(userMsg);
    //                 //     const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
    //                 //     botMsg.then(msg => manager(userID, [msg.message_id]))
    //                 //     return await clearChat(userID, messageHistory);
    //                 // }
    //                 if (msgText === 'Готово') {
    //                     messageHistory.push(userMsg);
    //                     if (newDatas.file_id !== null) {
    //                         await Order.update(
    //                             { file_id: newDatas.file_id },
    //                             { where: { order_id: order_id } }
    //                         )
    //                     }
    //                     if (newDatas.img_id !== null) {
    //                         await Order.update(
    //                             { img_id: newDatas.img_id },
    //                             { where: { order_id: order_id } }
    //                         )
    //                     }
    //                     if (newDatas.description !== oldDescription) {
    //                         await Order.update(
    //                             { description: newDatas.description },
    //                             { where: { order_id: order_id } }
    //                         )
    //                     }
    //                     if (newDatas.file_id == null &&
    //                         newDatas.img_id == null &&
    //                         newDatas.description == oldDescription) {
    //                         bot.removeListener('message', editListener);
    //                         const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
    //                         botMsg.then(msg => manager(userID, [msg.message_id]))
    //                         return await clearChat(userID, messageHistory);
    //                     }
    //                     bot.removeListener('message', editListener);
    //                     await clearChat(userID, messageHistory);
    //                     const botMsg = botSendMessage(userID, 'Изменения обновлены', managerMenu);
    //                     const shownOrders = findOrders(userID, { order_id: id });
    //                     shownOrders.then(order => {
    //                         messageHistory = [order[0].message_id];
    //                         botMsg.then(msg => messageHistory.push(msg.message_id));
    //                         return manager(userID, messageHistory);
    //                     });
    
    //                 }
    //                 if (msgText !== 'Отменить' &&
    //                     msgText !== 'Готово' &&
    //                     !msg.photo && !msg.document) {
    //                     newDatas.description = msgText;
    //                     bot.editMessageCaption(msgText, { chat_id: userID, message_id: previewOrderID });
    //                     bot.deleteMessage(userID, userMsg)
    //                     // messageHistory.push(userMsg);
    //                     const botMsg = botSendMessage(userID, 'Описание обновлено!', editOptions);
    //                     botMsg.then(msg => messageHistory.push(msg.message_id))
    //                 }
    //             }
    //         });
    //     } catch (e) {
    //         console.log(e);
    //     }
    // }
    // const createOrder2 = async (userID) => {
//     let messageHistory = []; 
//     const infoText = "Отправь отдельно:\nМакет(.cdr). Название заказа берется из названия файла!\nИзображение\nОписание"
//     const newOrder = {
//         order_name: null,
//         manager_id: userID,
//         manager_name: null,
//         file_id: null,
//         img_id: null,
//         description: null,
//     }
//     const botMsg = botSendMessage(userID, infoText, cancelOption);
//     try {
//         botMsg.then(msg => messageHistory.push(msg.message_id));
//         bot.on('message', async function dataListener(msg) {
//             const chatId = msg.chat.id;
//             newOrder.manager_name = msg.from.username;
//             // console.log(msg)
//             if (chatId == userID) {
//                 const userMsg = msg.message_id;
//                 messageHistory.push(userMsg);
//                 if (!!msg.document) {
//                     if (isCDRfile(msg.document.file_name)) {
//                         newOrder.order_name = msg.document.file_name.slice(0, -4);
//                         newOrder.file_id = msg.document.file_id;
//                         const botMsg = botSendMessage(userID, `Файл загружен!`, cancelOption);
//                         botMsg.then(msg => messageHistory.push(msg.message_id));
//                     } else {
//                         const botMsg = botSendMessage(userID, `Кажется файл не того формата`, cancelOption);
//                         botMsg.then(msg => messageHistory.push(msg.message_id));
//                     }
//                 }
//                 if (!!msg.photo) {
//                     const HDPhoto = msg.photo.length - 1;
//                     newOrder.img_id = msg.photo[HDPhoto].file_id;
//                     const botMsg = botSendMessage(userID, `Изображение загружено!`, cancelOption);
//                     botMsg.then(msg => messageHistory.push(msg.message_id));
//                 }
//                 if (msg.text === 'Отменить') {
//                     const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
//                     botMsg.then(msg => manager(userID, [msg.message_id]));
//                     await clearChat(userID, messageHistory);
//                     return bot.removeListener('message', dataListener);
//                 }
//                 // if (msg.text === "/start") {
//                 //     const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
//                 //     botMsg.then(msg => manager(userID, msg.message_id));
//                 //     await clearChat(userID, messageHistory);
//                 //     return bot.removeListener('message', dataListener);
//                 // }
//                 if (!!msg.text) {
//                     newOrder.description = msg.text;
//                     const botMsg = botSendMessage(userID, "Описание загружено!", cancelOption);
//                     botMsg.then(msg => messageHistory.push(msg.message_id));
//                 }
//                 if (newOrder.order_name !== null &&
//                     newOrder.manager_id !== null &&
//                     newOrder.img_id !== null &&
//                     newOrder.description !== null &&
//                     newOrder.file_id !== null) {
//                     newOrder.manager_name = msg.chat.username;
//                     bot.removeListener('message', dataListener);
//                     const order = await Order.create(newOrder);
//                     const shownOrder = findOrders(userID, { order_id: order.dataValues.order_id })
//                     shownOrder.then(async (orders) => {
//                         await clearChat(userID, messageHistory);
//                         console.log(orders)
//                         messageHistory = [orders[0].message_id];
//                         // await orders.forEach(order => messageHistory.push(order.message_id))
//                         const botMsg = botSendMessage(userID, `Заказ создан`, managerMenu);
//                         botMsg.then(msg => {
//                             messageHistory.push(msg.message_id);
//                             console.log(messageHistory);
//                             manager(userID, messageHistory);
//                         })
//                     })
//                     return
//                 }
//             }
//         })
//     } catch (e) {
//         return console.log(e)
//     }
// }

// Проверка формата файла
