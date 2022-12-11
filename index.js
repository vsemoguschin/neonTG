require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const { Op, where } = require('sequelize')
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
// const webApp = window.Telegram.WebApp;

// const PORT = process.env.PORT || 5000;
const app = express();
const token = process.env.TOKEN;
const serverID = -1001796968322;




const bot = new TelegramAPI(token, { polling: true });

const users = {
    managers: [
        { id: 317401874, }
    ]
    // max: 368152093,
}
users.managers.map(el => console.log(el.id));


//Команды бота
// bot.setMyCommands([
//     { command: '/start', description: 'menu' }
// ]);

//Кнопка отмены
const cancelOption = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Отменить' }],
        ],
    })
}

//Опции при редактировании заказа
const editOptions = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Готово' }],
            [{ text: 'Отменить' }],
        ],
    })
}

//Состояние заказов
const orderConditions = {
    0: 'Ждёт фрезеровку',
    1: 'Ждёт сборку',
    2: 'В работе',
    3: 'Собран',
    done: 'Заказ выполнен',
}

//Основное меню
const workMenu = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Менеджер' }],
            [{ text: 'Макеты' }],
            [{ text: 'Сборщик' }],
            [{ text: 'Отправить' }],
        ],
    })
}

//Меню менеджера
//https://api.telegram.org/bot5575099005:AAFREUhpqvo12MIMn-8OumJylxogNkEV1us/sendMessage?chat_id=317401874&text=Enter%20your%20text%20here&reply_markup=%7B%22keyboard%22:[[%7B%22text%22:%22Создать%20заказ%22%7D],[%7B%22text%22:%22Все%20заказы%22%7D],[%7B%22text%22:%22Мои%20заказы%22%7D],[%7B%22text%22:%22Назад%20в%20меню%22%7D]]%7D
const managerMenu = {
    reply_markup: JSON.stringify(
        {
            keyboard: [
                [{ text: 'Создать заказ' }],
                [{ text: 'Все заказы' }, { text: 'Мои заказы' }],
            ],
        }
    )
}
// console.log(managerMenu)

const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        users.managers.forEach(user => bot.sendMessage(user.id, 'Погнали!'));
        users.managers.forEach(user => manager(user.id));
    } catch (e) {
        console.log(e);
    }
};

//Запуск бота
start();

//Функции менеджера
const manager = async (userID, lastMsg = []) => {
    let messageHistory = lastMsg;
    const botMsg = botSendMessage(userID, 'Меню менеджера', managerMenu);
    botMsg.then(msg => messageHistory.push(msg.message_id));
    try {
        bot.on('message', async function managerListener(msg) {
            const chatId = msg.chat.id;
            if (chatId == userID) {
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
                        const shownOrders = showOrders(userID, { is_done: false });
                        shownOrders.then(async (orders) => {
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
                        const shownOrders = showOrders(userID, { is_done: false });
                        shownOrders.then(async (orders) => {
                            const botMsgs = orders.map(order => order.message_id)
                            messageHistory = botMsgs;
                            const botMsg = botSendMessage(userID, "Твои активные заказы", managerMenu);
                            botMsg.then(msg => {
                                messageHistory.push(msg.message_id);
                                manager(userID, messageHistory);
                            });
                        })
                        return bot.removeListener('message', managerListener);
                    }
                    if (msgText.slice(0, 6) == '/send_') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        bot.removeListener('message', managerListener);
                        return await getDeliveryDatas(userID, +msgText.slice(6));
                    }
                    if (msgText.slice(0, 6) == '/file_') {
                        return getFile(userID, +msgText.slice(6));
                    }
                    if (msgText.slice(0, 6) == '/edit_') {
                        messageHistory.push(userMsg);
                        await clearChat(userID, messageHistory);
                        bot.removeListener('message', managerListener);
                        return await editOrder(userID, +msgText.slice(6));
                    }
                    // if (msg.text === "/start") {
                    //     messageHistory.push(userMsg);
                    //     bot.removeListener('message', managerListener);
                    //     await bot.sendMessage(chatId, "Меню", managerMenu);
                    //     return clearChat(userID, messageHistory);
                    // }
                    if (msgText !== 'Все заказы' &&
                        msgText !== 'Создать заказ' &&
                        msgText !== 'Мои заказы' &&
                        msgText.slice(0, 6) !== '/send_') {
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

//Отправка сообщения ботом
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
// const forms = JSON.stringify(managerMenu);
// console.log(encodeURI(managerMenu.reply_markup))
// const res = botSendMessage(317401874, encodeURI('text dscef dsc'), encodeURI(managerMenu.reply_markup));
// res.then((el) => { console.log(el) })


// создание заказа и внесение в БД
const createOrder = async (userID) => {
    let messageHistory = [];
    const infoText = "Отправь отдельно:\nМакет(.cdr). Название заказа берется из названия файла!\nИзображение\nОписание"
    const newOrder = {
        order_name: null,
        manager_id: userID,
        manager_name: null,
        file_id: null,
        img_id: null,
        description: null,
    }
    const botMsg = botSendMessage(userID, infoText, cancelOption);
    try {
        botMsg.then(msg => messageHistory.push(msg.message_id));
        bot.on('message', async function dataListener(msg) {
            const chatId = msg.chat.id;
            newOrder.manager_name = msg.from.username;
            // console.log(msg)
            if (chatId == userID) {
                const userMsg = msg.message_id;
                messageHistory.push(userMsg);
                if (!!msg.document) {
                    if (isCDRfile(msg.document.file_name)) {
                        newOrder.order_name = msg.document.file_name.slice(0, -4);
                        newOrder.file_id = msg.document.file_id;
                        const botMsg = botSendMessage(userID, `Файл загружен!`, cancelOption);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                    } else {
                        const botMsg = botSendMessage(userID, `Кажется файл не того формата`, cancelOption);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                    }
                }
                if (!!msg.photo) {
                    const HDPhoto = msg.photo.length - 1;
                    newOrder.img_id = msg.photo[HDPhoto].file_id;
                    const botMsg = botSendMessage(userID, `Изображение загружено!`, cancelOption);
                    botMsg.then(msg => messageHistory.push(msg.message_id));
                }
                if (msg.text === 'Отменить') {
                    const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]));
                    await clearChat(userID, messageHistory);
                    return bot.removeListener('message', dataListener);
                }
                // if (msg.text === "/start") {
                //     const botMsg = botSendMessage(userID, "Заказ не создан", managerMenu);
                //     botMsg.then(msg => manager(userID, msg.message_id));
                //     await clearChat(userID, messageHistory);
                //     return bot.removeListener('message', dataListener);
                // }
                if (!!msg.text) {
                    newOrder.description = msg.text;
                    const botMsg = botSendMessage(userID, "Описание загружено!", cancelOption);
                    botMsg.then(msg => messageHistory.push(msg.message_id));
                }
                if (newOrder.order_name !== null &&
                    newOrder.manager_id !== null &&
                    newOrder.img_id !== null &&
                    newOrder.description !== null &&
                    newOrder.file_id !== null) {
                    newOrder.manager_name = msg.chat.username;
                    bot.removeListener('message', dataListener);
                    const order = await Order.create(newOrder);
                    const shownOrder = showOrders(userID, { order_id: order.dataValues.order_id })
                    shownOrder.then(async (orders) => {
                        await clearChat(userID, messageHistory);
                        console.log(orders)
                        messageHistory = [orders[0].message_id];
                        // await orders.forEach(order => messageHistory.push(order.message_id))
                        const botMsg = botSendMessage(userID, `Заказ создан`, managerMenu);
                        botMsg.then(msg => { 
                            messageHistory.push(msg.message_id);
                            console.log(messageHistory);
                            manager(userID, messageHistory);
                        })
                    })
                    return
                }
            }
        })
    } catch (e) {
        return console.log(e)
    }
}

// Проверка формата файла
const isCDRfile = (name) => {
    return name.slice(-4) === ".cdr"
}

//Показать заказы по заданным параметрам
const showOrders = async (chatId, parameters, cartOptions) => {
    try {
        const foundOrders = await Order.findAll({ where: parameters, order: ['createdAt'] });
        const orders = sendOrders(chatId, foundOrders, cartOptions);
        return orders.then(el => el);
    } catch (e) {
        return console.log(e)
    }
}

//Отправить заказы в бот-чат
const sendOrders = async (chatId, orders, cartOptions) => {
    let datas = [];
    if (orders.length === 0) {
        const botMsg = botSendMessage(chatId, "Тут пусто", managerMenu);
        botMsg.then(msg => datas.push(msg.message_id));
        return datas
    }
    try {
        for (let order of orders) {
            const orderCart = await createOrderCart(chatId, order, cartOptions);
            // console.log(orderCart)
            datas.push(orderCart);
        }
        return datas
    } catch (e) {
        return console.log(e)
    }
}

//Прислать карточку заказа
const createOrderCart = async (chatId, order, cartOptions) => {
    const { order_id, order_name, manager_id, manager_name, file_id, img_id, description, master_name, condition, delivery } = order.dataValues;
    let orderCaption = {
        mainDesc: `<b>Название заказа:</b> <i>${order_name}</i>
<b>Менеджер:</b> <a href="tg://user?id=${manager_id}">${manager_name}</a>
<b>Описание:</b>
<i>${description}</i>`,
        stage:
            `\n<b>Статус:</b> ${condition}`,
        actions: `\n/edit_${order_id} - <i>Изменить заказ</i>
/send_${order_id} - <i>Внести/Изменить данные для отправки заказа</i>
/del_${order_id} - <i>Удалить заказ</i>
/file_${order_id} - <i>Макет</i>`,
        deliveryInfo: '\n<b>Отправить:</b> ' + delivery
    }
    const { mainDesc, stage, actions, deliveryInfo } = orderCaption;
    let orderText = ''
    if (cartOptions == 'edit') {
        orderText = description;
        // bot.sendDocument(chatId, file_id)
    } else {
        orderText = mainDesc + stage + actions + deliveryInfo;
    }
    return botSendPhoto(chatId, img_id, encodeURI(orderText));
}

//очистить чат(Доработать, чтобы без ошибок)
const clearChat = async (chatId, messages) => {
    messages.forEach(msg => {
        return bot.deleteMessage(chatId, msg);
    });
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
                        const shownOrders = showOrders(userID, { order_id: id });
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

//прислать макеты
const getFile = async (userID, order_id) => {
    try {
        console.log(order_id)
        const file = await Order.findOne({ where: { order_id: order_id } });
        return bot.sendDocument(userID, file.dataValues.file_id);
    } catch (e) {
        return console.log(e)
    }
}


const editOrder = async (userID, order_id, lastMsg = []) => {
    let messageHistory = lastMsg;
    const infoText = 'Отправь то, что нужно изменить.\nЕсли это информация заказа - отправь новый текст.\nИзображение - изображение. Макет - файл\nОтправь "Готово" если необходимые изменения внесены'
    let newDatas = {
        file_id: null,
        img_id: null,
        description: null,
    }
    const botMsg = botSendMessage(userID, infoText, editOptions);
    try {
        botMsg.then(msg => {
            messageHistory.push(msg.message_id);
        });
        const editingOrder = showOrders(userID, { order_id: order_id }, 'edit');
        let previewOrderID = 0;
        let oldDescription = '';
        editingOrder.then(order => {
            messageHistory.push(order[0].message_id);
            previewOrderID = order[0].message_id;
            newDatas.description = order[0].caption;
            oldDescription = order[0].caption;
        })
        bot.on('message', async function editListener(msg) {
            console.log(messageHistory);
            const chatId = msg.chat.id;
            if (userID == chatId) {
                const userMsg = msg.message_id;
                const msgText = msg.text;
                const id = order_id;
                if (!!msg.document) {
                    if (isCDRfile(msg.document.file_name)) {
                        newDatas.file_id = msg.document.file_id;
                        messageHistory.push(userMsg);
                        const botMsg = botSendMessage(userID, `Файл загружен!`, editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                    }
                    else {
                        messageHistory.push(userMsg);
                        const botMsg = botSendMessage(userID, `Кажется файл не того формата`, editOptions);
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                    }
                }
                if (!!msg.photo) {
                    newDatas.img_id = msg.photo[3].file_id;
                    // messageHistory.push(userMsg); 
                    bot.deleteMessage(userID, userMsg)
                    bot.editMessageMedia({ type: 'photo', media: msg.photo[3].file_id, caption: newDatas.description }, { chat_id: userID, message_id: previewOrderID })
                    // const botMsg = botSendMessage(userID, `Изображение обновлено!`, editOptions);
                    // botMsg.then(msg => messageHistory.push(msg.message_id));
                }
                if (msgText === 'Отменить') {
                    bot.removeListener('message', editListener);
                    messageHistory.push(userMsg);
                    const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
                    botMsg.then(msg => manager(userID, [msg.message_id]))
                    return await clearChat(userID, messageHistory);
                }
                // if (msgText === '/start') {
                //     bot.removeListener('message', editListener);
                //     messageHistory.push(userMsg);
                //     const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
                //     botMsg.then(msg => manager(userID, [msg.message_id]))
                //     return await clearChat(userID, messageHistory);
                // }
                if (msgText === 'Готово') {
                    messageHistory.push(userMsg);
                    if (newDatas.file_id !== null) {
                        await Order.update(
                            { file_id: newDatas.file_id },
                            { where: { order_id: order_id } }
                        )
                    }
                    if (newDatas.img_id !== null) {
                        await Order.update(
                            { img_id: newDatas.img_id },
                            { where: { order_id: order_id } }
                        )
                    }
                    if (newDatas.description !== oldDescription) {
                        await Order.update(
                            { description: newDatas.description },
                            { where: { order_id: order_id } }
                        )
                    }
                    if (newDatas.file_id == null &&
                        newDatas.img_id == null &&
                        newDatas.description == oldDescription) {
                        bot.removeListener('message', editListener);
                        const botMsg = botSendMessage(userID, 'Данные не обновлены', managerMenu);
                        botMsg.then(msg => manager(userID, [msg.message_id]))
                        return await clearChat(userID, messageHistory);
                    }
                    bot.removeListener('message', editListener);
                    await clearChat(userID, messageHistory);
                    const botMsg = botSendMessage(userID, 'Изменения обновлены', managerMenu);
                    const shownOrders = showOrders(userID, { order_id: id });
                    shownOrders.then(order => {
                        messageHistory = [order[0].message_id];
                        botMsg.then(msg => messageHistory.push(msg.message_id));
                        return manager(userID, messageHistory);
                    });

                }
                if (msgText !== 'Отменить' &&
                    msgText !== 'Готово' &&
                    !msg.photo && !msg.document) {
                    newDatas.description = msgText;
                    bot.editMessageCaption(msgText, { chat_id: userID, message_id: previewOrderID });
                    bot.deleteMessage(userID, userMsg)
                    // messageHistory.push(userMsg);
                    const botMsg = botSendMessage(userID, 'Описание обновлено!', editOptions);
                    botMsg.then(msg => messageHistory.push(msg.message_id))
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
}

// bot.sendMessage(317401874, '<del>strikethrough</del>', {
//     reply_markup: {
//         inline_keyboard: [
//             [{ text: 'fsdf',callback_data:'safafd' }]]
//     }
// });

// 317401874
// удалить таблицу
//  sequelize.drop()

let obj = {
    order_id: 1,
    order_name: 'name',
    manager_id: 12,
    manager_name: 'vasa',
    file_id: 123344,
    img_id: 987,
    description: 'desc',
    master_name: 'anton',
    condition: 'done',
    delivery: 'send'
}
const { order_id, order_name, manager_name, manager_id, img_id, description, condition, delivery } = obj;


