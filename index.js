require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
// const models = require('./models/models');
const TelegramAPI = require('node-telegram-bot-api');
const { Order } = require('./models/models');

// const PORT = process.env.PORT || 5000;
// const app = express();
const token = process.env.TOKEN;

const bot = new TelegramAPI(token, { polling: true })

bot.setMyCommands([
    { command: '/menu', description: 'menu' }
]);

const menuOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: 'Создать заказ', callback_data: 'createOrder' }],
            [{ text: 'Заказы', callback_data: 'orders' }],
            [{ text: 'Макеты', callback_data: 'makets' }],
            [{ text: 'Сборщикам', callback_data: 'making' }],
            [{ text: 'Создать заказ WB', callback_data: 'createWBOrder' }],
        ]
    })
}



const orderOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: 'в работу', callback_data: 'toWork' }],
        ]
    })
}

function add(id) {

}

const start = async () => {
    try {
        await sequelize.authenticate()
        await sequelize.sync()
        // app.listen(PORT, () => console.log('first'))
        bot.on('message', async msg => {
            const chatId = msg.chat.id;
            if (msg.text === '/menu') {
                await bot.sendMessage(chatId, "Чё хочешь?", menuOptions)
            }
            // console.log(msg)
            if (msg.document !== undefined) {
                createOrder(msg);
                await bot.sendMessage(chatId, 'Теперь изображение и описание')
            }
            // bot.sendMessage(chatId, `${msg.message_id}`)
            // bot.forwardMessage(chatId, chatId, 990)
        })
        bot.on('callback_query', async msg => {
            const chatId = msg.message.chat.id;
            if (msg.data === 'createOrder') {
                await bot.sendMessage(chatId, "Прикрепи файл и напиши название");
            }
            if (msg.data === 'orders') {
                await Order.findAll().then(orders => showAllOrders(orders, chatId))
            }
            if (msg.data === 'makets') {
                await Order.findAll().then(orders => showAllMakets(orders, chatId))
            }
            if (msg.data === 'making') {
                await Order.findAll({ where: { condition: 1 } }).then(orders => showAllOrders(orders, chatId))
            }
            if (msg.data === 'toWork') {
                console.log(msg.message.text)
                await changeCondition(msg.message.text)
            }
            // console.log(msg.)
        })
    } catch (e) {
        console.log(e)
    }
}



start()

const createOrder = function (obj) {
    const order = {
        name: obj.caption,
        msg_file_id: obj.message_id,
        msg_desc_id: obj.message_id + 2,
    }
    Order.create(order)
}

const showAllOrders = function (orders, chatId) {
    orders.forEach(async order => {
        // const file = order.dataValues.msg_file_id;
        const desc = order.dataValues.msg_desc_id;
        await bot.forwardMessage(chatId, chatId, desc)
    });
}

const showAllMakets = async function (orders, chatId) {
    // await orders.forEach(order => {
    //     const file = order.dataValues.msg_file_id;
    //     console.log(order.dataValues.name)
    //     bot.sendMessage(chatId, 'отдать в работу' + order.dataValues.name, orderOptions)
    //         .then(() => { bot.forwardMessage(chatId, chatId, file); })
    // });
    for (const order of orders) {
        const file = order.dataValues.msg_file_id;
        await bot.forwardMessage(chatId, chatId, file)
        await bot.sendMessage(chatId, order.dataValues.name, orderOptions)
    }
}



const changeCondition = async function (orderName) {
    await Order.update(
        { condition: 1 },
        { where: { name: orderName } }
    )
}
// sequelize.drop()
