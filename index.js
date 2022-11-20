require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const { Op, where } = require('sequelize')
const models = require('./models/models');
const TelegramAPI = require('node-telegram-bot-api');
const { Order } = require('./models/models');
const { sync } = require('./db');
const { text } = require('express');
// const webApp = window.Telegram.WebApp;

// const PORT = process.env.PORT || 5000;
const app = express();
const token = process.env.TOKEN;
const serverID = -1001796968322;

const bot = new TelegramAPI(token, { polling: true });

bot.setMyCommands([
    { command: '/start', description: 'menu' }
]);

const menuOptions = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Создать заказ' }],
            [{ text: 'Работа' }],
            // [{ text: 'Заказы в работе' }],
        ],
    })
}

const cancelOption = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Отменить' }],
        ],
    })
}

const orderConditions = {
    0: 'Ждёт фрезеровку',
    1: 'Ждёт сборку',
    2: 'В работе',
    3: 'Собран',
    done: 'Заказ выполнен',
}

const ordersMenu = {
    reply_markup: JSON.stringify({
        keyboard: [
            // [{ text: 'Ждёт фрезеровку' }],
            // [{ text: 'Ждёт сборку' }],
            // [{ text: 'В работе' }],
            // [{ text: 'Собран' }],
            // [{ text: 'Заказ выполнен' }],
            [{ text: 'Назад в меню' }],
        ],
    })
}
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
const managerMenu = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Создать заказ' }],
            [{ text: 'Все заказы' }],
            [{ text: 'Мои заказы' }],
            [{ text: 'Назад в меню' }],
        ],
    })
}

const start = async () => {
    try {
        bot.removeAllListeners('message')
        await sequelize.authenticate();
        await sequelize.sync();
        bot.on('message', async function mainListener(msg) {
            //  console.log(msg)
            const chatId = msg.chat.id;
            const msgText = msg.text;
            const msgId = msg.message_id;
            if (msgText == '/start') {
                await bot.sendMessage(chatId, "Меню", workMenu);
                await bot.deleteMessage(chatId, msgId);
                return bot.deleteMessage(chatId, +msgId - 1);
            }
            // if (msgText == 'Создать заказ') {
            //     await bot.sendMessage(chatId, "Отправь макет(.cdr)\nНазвание заказа берется из названия файла!", cancelOption);
            //     await bot.deleteMessage(chatId, +msgId - 1);
            //     await bot.deleteMessage(chatId, msgId);
            //     return createOrder(chatId, msgId);
            // }
            // if (msgText == 'Заказы в работе') {
            //     await bot.sendMessage(chatId, "Активные заказы", ordersMenu);
            //     await bot.deleteMessage(chatId, +msgId - 1);
            //     await aboutOrders(chatId)
            //     await showOrders(chatId, { condition: { [Op.notLike]: '%' + orderConditions.done } })
            //     return bot.deleteMessage(chatId, msgId);
            // }
            if (msg.text == 'Менеджер') {
                // await bot.deleteMessage(chatId, +msgId - 1); 
                await manager(chatId);
                return clearChat(chatId, msgId);
            };
            if (msg.text == 'Макеты') {
                bot.sendMessage(chatId, 'Макеты', workMenu);
                await showOrders(chatId, { condition: 'Ждёт фрезеровку' });
                return clearChat(chatId, msgId);
            };
            if (msg.text == 'Отправить') {
                bot.sendMessage(chatId, 'Нужно отправить', workMenu);
                await showOrders(chatId, { delivery: { [Op.not]: null } });
                return clearChat(chatId, msgId);
            };
        })
    } catch (e) {
        console.log(e)
    }
}

start()

// создание заказа и внесение в БД
const createOrder = async (currentChatId) => {
    const newOrder = {
        order_name: null,
        manager_id: null,
        manager_name: null,
        file_id: null,
        photo_id: null,
        description: null
    }
    bot.on('message', async function datasListener(msg) {
        const chatId = msg.chat.id;
        console.log(msg)
        if (currentChatId == chatId) {
            if (!!msg.document) {
                if (isCDRfile(msg.document.file_name)) {
                    newOrder.order_name = msg.document.file_name.slice(0, -4);
                    newOrder.manager_id = chatId;
                    newOrder.manager_name = msg.from.username;
                    newOrder.file_id = msg.document.file_id;
                    if (newOrder.photo_id !== null && newOrder.description !== null) {
                        try {
                            bot.removeListener('message', datasListener);
                            const order = await Order.create(newOrder)
                            // await showOrder(order, chatId);
                            await bot.sendMessage(chatId, `Заказ создан`, managerMenu);
                            return clearChat(chatId, msg.message_id);
                        } catch (e) {
                            console.log(e)
                        }
                    } else {
                        await bot.sendMessage(chatId, `Отправь фото и напиши описание заказа ${newOrder.order_name}`, cancelOption);
                    }
                } else {
                    return await bot.sendMessage(chatId, `Кажется файл не того формата`, cancelOption);
                }
            } else if (!!msg.photo && !!msg.caption) {
                newOrder.photo_id = msg.photo[3].file_id;
                newOrder.description = msg.caption;
                if (newOrder.order_name !== null &&
                    newOrder.manager_id !== null &&
                    newOrder.manager_name !== null &&
                    newOrder.file_id !== null) {
                    try {
                        bot.removeListener('message', datasListener);
                        const order = await Order.create(newOrder)
                        // await showOrder(order);
                        await bot.sendMessage(chatId, `Заказ создан`, managerMenu);
                        await manager(chatId)
                        return clearChat(chatId, msg.message_id);
                    } catch (e) {
                        console.log(e)
                    }
                } else {
                    await bot.sendMessage(chatId, `Окей, теперь отправь макет(.cdr)`, cancelOption);
                }
            } else if (msg.text === 'Отменить') {
                await bot.sendMessage(chatId, "Заказ не создан", managerMenu);
                await manager(chatId)
                await clearChat(chatId, msg.message_id);
                return bot.removeListener('message', datasListener);
            } else if (msg.text === "/start") {
                await bot.sendMessage(chatId, "Заказ не создан", workMenu);
                await clearChat(chatId, msg.message_id);
                return bot.removeListener('message', datasListener);
            } else {
                return bot.sendMessage(chatId, `Забыл что-то\nНужно отправить картинку с описанием`, cancelOption);
            }
        }
    })
}

// Проверка формата файла
const isCDRfile = (name) => {
    return name.slice(-4) === ".cdr"
}

//Посмотреть информацию о заказах
const aboutOrders = async (currentChatId) => {
    try {
        bot.on('callback_query', async function keyboardListener(msg) {
            const chatId = msg.message.chat.id;
            console.log(msg)
            if (msg.data === '0') {
                // console.log(msg.message);
                await bot.deleteMessage(chatId, msg.message.message_id);
                await bot.deleteMessage(chatId, msg.message.message_id - 1);
                await changeCondition(+msg.message.text, 1);
                // console.log(Order.findAll({ where: { id: +msg.message.text } }))
                return Order.findOne({ where: { id: +msg.message.text } }).then(order => {
                    const orderName = order.dataValues.name;
                    return bot.sendMessage(chatId, `Заказ ${orderName} вырезан. Отправлен на сборку`);
                })
            }
            if (msg.data === 'toSecondCondition') {
                console.log(msg);
                const masterName = msg.from.username;
                const masterId = msg.from.id;
                await bot.deleteMessage(chatId, msg.message.message_id);
                await bot.deleteMessage(chatId, msg.message.message_id - 1);
                await changeCondition(+msg.message.text, 1);
                // console.log(Order.findAll({ where: { id: +msg.message.text } }))
                await Order.update(
                    {
                        master_id: masterId,
                        master_name: masterName
                    },
                    { where: { id: +msg.message.text } }
                )
                return Order.findOne({ where: { id: +msg.message.text } }).then(order => {
                    const orderName = order.dataValues.name;
                    return bot.sendMessage(chatId, `Заказ ${orderName} начал собирать ${masterName}`);
                })
            }
            if (msg.data === 'levelDn') {
                // console.log(msg)
                await bot.deleteMessage(chatId, msg.message.message_id);
                await bot.deleteMessage(chatId, msg.message.message_id - 1);
                await changeCondition(+msg.message.text, -1);
                return Order.findOne({ where: { id: +msg.message.text } }).then(order => {
                    const orderName = order.dataValues.name;
                    console.log(order)
                    return bot.sendMessage(chatId, `Заказ ${orderName} отправлен на предыдущий этап изготовления`);
                })
            }
        })
        bot.on('message', async function ordersListener(msg) {
            const chatId = msg.chat.id;
            if (chatId == currentChatId) {
                for (key in orderConditions) {
                    if (msg.text == orderConditions[key]) {
                        await bot.sendMessage(chatId, msg.text, ordersMenu);
                        await showOrders(chatId, { condition: msg.text })
                        return clearChat(chatId, msg.message_id);
                    }
                }
                if (msg.text == 'Назад в меню' || msg.text === "/start") {
                    bot.removeListener('message', ordersListener);
                    await bot.sendMessage(chatId, "Меню", menuOptions);
                    return clearChat(chatId, msg.message_id);
                }
                else {
                    await bot.sendMessage(chatId, "Используй команды клавиатуры для выбора", ordersMenu);
                    return bot.deleteMessage(chatId, msg.message_id);
                }
            }
        })
    } catch (e) {
        console.log(e);
    }


}

const changeCondition = async (id, change) => {
    Order.findOne({ where: { id: id } }).then(order => {
        const oldCondition = order.dataValues.condition;
        console.log(oldCondition);
        return Order.update(
            { condition: oldCondition + change },
            { where: { id: id } }
        )
    })
}

//Показать заказы по заданным параметрам
const showOrders = async (chatId, parameters) => {
    try {
        const foundOrders = await Order.findAll({ where: parameters });
        return sendOrders(chatId, foundOrders);
    } catch (e) {
        return console.log(e)
    }
}
const filesOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: 'Назад в меню' }],
        ],
    }
}
// bot.sendMessage(317401874, '<del>strikethrough</del>', {
//     reply_markup: {
//         inline_keyboard: [
//             [{ text: 'fsdf',callback_data:'safafd' }]]
//     }
// });

//Отправить заказы в бот-чат
const sendOrders = async (chatId, orders) => {
    if (orders.length === 0) {
        return bot.sendMessage(chatId, "Тут пусто");
        console.log('empty')
    }
    try {
        for (let order of orders) {
            await createOrderCart(chatId, order)
        }
        // console.log(orders)
    } catch (e) {
        return console.log(e)
    }
    return
}

//Прислать карточку заказа
const createOrderCart = async (chatId, order) => {
    const { id, order_name, manager_id, manager_name, file_id, photo_id, description, master_name, condition, delivery } = order.dataValues;
    let orderCaption =
        `<b>Название заказа:</b> <i>${order_name}</i>
<b>Менеджер:</b> <a href="tg://user?id=${manager_id}">${manager_name}</a>
<b>Описание:</b>
<i>${description}</i>
<b>Статус:</b> ${condition}
/send_${id} - <i>Отправить заказ</i>
/edit_${id} - <i>Изменить заказ</i>
/del_${id} - <i>Удалить заказ</i>
/file_${id} - <i>Макет</i>
`;
    if (delivery !== null) {
        orderCaption = orderCaption + '<b>Отправить:</b> ' + delivery
    }
    await bot.sendPhoto(chatId, photo_id, { caption: orderCaption, parse_mode: 'HTML' })
    // return bot.sendDocument(chatId, file_id)
}

//очистить чат(Доработать, чтобы без ошибок)
const clearChat = async (chatId, lastMessage) => {
    for (let i = 0; i < 50; i++) {
        bot.deleteMessage(chatId, lastMessage - i)
    }
    return
}

// 317401874
// удалить таблицу
// sequelize.drop()


//Функции менеджера
const manager = async (currentChatId) => {
    try {
        await bot.sendMessage(currentChatId, 'Меню менеджера', managerMenu);
        bot.on('message', async function managerListener(msg) {
            // console.log(msg)
            const chatId = msg.chat.id;
            if (chatId == currentChatId) {
                const msgText = msg.text;
                const msgId = msg.message_id;
                if (msgText == 'Создать заказ') {
                    await bot.sendMessage(chatId, "Отправь макет(.cdr)\nНазвание заказа берется из названия файла!", cancelOption);
                    await bot.deleteMessage(chatId, +msgId - 1);
                    await bot.deleteMessage(chatId, msgId);
                    bot.removeListener('message', managerListener);
                    return createOrder(chatId);
                }
                if (msgText == 'Все заказы') {
                    await bot.sendMessage(chatId, "Активные заказы", managerMenu);
                    await bot.deleteMessage(chatId, +msgId - 1);
                    await showOrders(chatId, { is_done: false })
                    return bot.deleteMessage(chatId, msgId);
                }
                if (msgText == 'Мои заказы') {
                    await bot.sendMessage(chatId, "Твои заказы", managerMenu);
                    await bot.deleteMessage(chatId, +msgId - 1);
                    await showOrders(chatId, { manager_id: chatId });
                    await clearChat(chatId, msgId)
                    return bot.deleteMessage(chatId, msgId);
                }
                if (msgText.slice(0, 6) == '/send_') {
                    bot.removeListener('message', managerListener);
                    return await getDeliveryDatas(chatId, +msgText.slice(6));
                }
                if (msgText.slice(0, 6) == '/file_') {
                    return getFile(chatId, +msgText.slice(6));
                }
                if (msgText == 'Назад в меню') {
                    await bot.sendMessage(chatId, "Меню", workMenu);
                    bot.removeListener('message', managerListener);
                    return clearChat(chatId, msgId);
                }
                if (msg.text === "/start") {
                    bot.removeListener('message', managerListener);
                    await bot.sendMessage(chatId, "Меню", workMenu);
                    return clearChat(chatId, msgId);
                }
                else {
                    await bot.sendMessage(chatId, "Используй команды клавиатуры для выбора", managerMenu);
                    return bot.deleteMessage(chatId, msg.message_id);
                }
            }
        })
    } catch (e) {
        console.log(e)
    }
}


const getDeliveryDatas = async (currentChatId, order_id) => {
    try {
        await bot.sendMessage(currentChatId, 'Отправь данные для отправки', cancelOption);
        bot.on('message', async function deliveryListener(msg) {
            const chatId = msg.chat.id;
            if (currentChatId == chatId) {
                const deliveryData = msg.text;
                const id = order_id;
                if (msg.text == 'Отменить') {
                    bot.removeListener('message', deliveryListener);
                    await bot.sendMessage(chatId, 'Данные не внесены');
                    return await manager(chatId);
                }
                if (msg.text == '/start') {
                    bot.removeListener('message', deliveryListener);
                    return bot.sendMessage(chatId, 'Данные не внесены');
                }
                await Order.update(
                    { delivery: deliveryData },
                    { where: { id: id } });
                bot.removeListener('message', deliveryListener);
                await bot.sendMessage(chatId, 'Данные внесены');
                await showOrders(chatId, { id: id })
                await clearChat(chatId, msg.message_id);
                await manager(chatId);

            }
        })
    } catch (e) {
        return console.log(e)
    }
}

//прислать макеты
const getFile = async (currentChatId, order_id) => {
    try {
        console.log(order_id)
        const file = await Order.findOne({ where: { id: order_id } });
        return bot.sendDocument(currentChatId, file.dataValues.file_id);
    } catch (e) {
        return console.log(e)
    }
}

const editOrder = async (currentChatId, order_id) => {
    const infoText = 'Отправь то, что нужно изменить.\nЕсли это информация заказа - отправь новый текст.\nИзображение - изображение. Макет - файл'
    try {
        await bot.sendMessage(currentChatId, infoText, cancelOption);
        bot.on('message', async function editListener(msg) {
            const chatId = msg.chat.id;
            if (currentChatId == chatId) {
                const deliveryData = msg.text;
                const id = order_id;
                // await Order.update(
                //     { delivery: deliveryData },
                //     { where: { id: id } });
                return bot.sendMessage(chatId, 'Данные внесены' + id + deliveryData);
            }
        });
    } catch (e) {
        console.log(e);
    }
}


