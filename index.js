require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const models = require('./models/models');
const TelegramAPI = require('node-telegram-bot-api');
const { Order } = require('./models/models');

// const PORT = process.env.PORT || 5000;
const app = express();
const token = process.env.TOKEN;

const bot = new TelegramAPI(token, { polling: true });

bot.setMyCommands([
    { command: '/start', description: 'menu' }
]);

const menuOptions = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Создать заказ' }],
            [{ text: 'Заказы в работе' }],
        ],
    })
}

const ordersOptions = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Ждут фрезеровку' }],
            [{ text: 'Ждут сборку' }],
            [{ text: 'На сборке' }],
            [{ text: 'Готовые' }],
            [{ text: 'Назад в меню' }],
        ],
    })
}

const cancelOption = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Отменить' }],
            // [{ text: 'Заказы', callback_data: 'orders' }],
            // [{ text: 'Макеты', callback_data: 'makets' }],
            // [{ text: 'Сборщикам', callback_data: 'making' }],
            // [{ text: 'Создать заказ WB', callback_data: 'createWBOrder' }],
        ],
    })
}


const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            // bot.forwardMessage(chatId, chatId, 2840)
            const msgText = msg.text;
            if (msgText == 'Создать заказ') {
                createOrder(chatId);
            }
            else if (msgText == '/start') {
                bot.sendMessage(chatId, "дарова, заебал", menuOptions);
            } else if (msgText == 'Заказы в работе') {
                bot.sendMessage(chatId, "Что посмотреть?", ordersOptions);
                aboutOrders();
            }
        })
    } catch (e) {
        console.log(e)
    }
}

start()

// создание заказа и внесение в БД
const createOrder = async (id) => {
    const chatId = id;
    await bot.sendMessage(chatId, "Отправь макет(.cdr)\nНазвание заказа берется из названия файла!", cancelOption);
    const newOrder = {
        name: null,
        msg_file_id: null,
        owner: null,
        msg_desc_id: null
    }
    bot.on('message', async function datasListener(msg) {
        if (!!msg.document) {
            if (isCDRfile(msg.document.file_name)) {
                newOrder.owner = chatId;
                newOrder.name = msg.document.file_name.slice(0, -4);
                newOrder.msg_file_id = msg.message_id;
                if (newOrder.msg_desc_id !== null) {
                    await bot.sendMessage(chatId, `Твой заказ`, menuOptions);
                    await bot.forwardMessage(chatId, newOrder.owner, newOrder.msg_desc_id);
                    await bot.forwardMessage(chatId, newOrder.owner, newOrder.msg_file_id);
                    bot.removeListener('message', datasListener);
                    return Order.create(newOrder);
                } else {
                    await bot.sendMessage(chatId, `Отправь фото и напиши описание заказа ${newOrder.name}`, cancelOption);
                }
            } else {
                return await bot.sendMessage(chatId, `Кажется файл не того формата`, cancelOption);
            }
        } else if (!!msg.photo && !!msg.caption) {
            newOrder.msg_desc_id = msg.message_id;
            if (newOrder.owner !== null && newOrder.msg_file_id !== null && newOrder.name) {
                await bot.sendMessage(chatId, `Твой заказ`, menuOptions);
                await bot.forwardMessage(chatId, chatId, newOrder.msg_desc_id);
                await bot.forwardMessage(chatId, chatId, newOrder.msg_file_id);
                bot.removeListener('message', datasListener);
                return Order.create(newOrder);
            } else {
                await bot.sendMessage(chatId, `Окей, теперь отправь макет(.cdr)`, cancelOption);
            }
        } else if (msg.text === 'Отменить') {
            await bot.sendMessage(chatId, "Заказ не создан", menuOptions);
            return bot.removeListener('message', datasListener);
        } else {
            return bot.sendMessage(chatId, `Забыл что-то\nНужно отправить картинку с описанием`, cancelOption);
        }
    })
}

// Проверка формата файла
const isCDRfile = (name) => {
    return name.slice(-4) === ".cdr"
}

//Посмотреть информацию о заказах
const aboutOrders = () => {
    bot.on('callback_query', async function keyboardListener(msg) {
        const chatId = msg.message.chat.id;
        if (msg.data === 'toFirstCondition') {
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
        if (msg.text == 'Ждут фрезеровку') {
            return Order.findAll({ where: { condition: 0 } }).then(orders => showAllOrders(orders, chatId, 0))
        }
        if (msg.text == 'Ждут сборку') {
            return Order.findAll({ where: { condition: 1 } }).then(orders => showAllOrders(orders, chatId, 1))
        }
        if (msg.text == 'На сборке') {
            return Order.findAll({ where: { condition: 2 } }).then(orders => showAllOrders(orders, chatId, 2))
        }
        if (msg.text == 'Готовые') {
            return Order.findAll({ where: { condition: 3 } }).then(orders => showAllOrders(orders, chatId, 3))
        }
        if (msg.text == 'Назад в меню') {
            bot.removeListener('message', ordersListener);
            return bot.sendMessage(chatId, "дарова, заебал", menuOptions)
        }
        else {
            return bot.sendMessage(chatId, "Используй команды клавиатуры для выбора")
        }
    })

}


const showAllOrders = async function (orders, chatId, condition) {
    if (orders.length === 0) {
        return bot.sendMessage(chatId, "Тут пусто");
    }
    for (const order of orders) {
        const file = order.dataValues.msg_file_id;
        const desc = order.dataValues.msg_desc_id;
        if (condition == 0) {
            await bot.forwardMessage(chatId, order.owner, file)
            await bot.sendMessage(chatId, order.dataValues.id, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'На сборку', callback_data: 'toFirstCondition' }],
                    ],
                }
            })
        }
        if (condition == 1) {
            await bot.forwardMessage(chatId, order.owner, desc)
            await bot.sendMessage(chatId, order.dataValues.id, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Взять в работу', callback_data: 'toSecondCondition' }],
                    ],
                }
            })
        }
        if (condition == 2) {
            await bot.forwardMessage(chatId, order.owner, desc)
            await bot.sendMessage(chatId, `В работе у ${order.master_name}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Готов', callback_data: 'toThirdCondition' }],
                    ],
                }
            })
        }
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



// удалить таблицу
// sequelize.drop()
