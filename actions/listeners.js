
const managerListener = async function managerListener(msg) {
            // console.log(msg);
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
                        const shownOrders = showOrders(userID, { is_done: false });
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
                    // if (msgText.slice(0, 6) == '/send_') {
                    //     messageHistory.push(userMsg);
                    //     await clearChat(userID, messageHistory);
                    //     bot.removeListener('message', managerListener);
                    //     return await getDeliveryDatas(userID, +msgText.slice(6));
                    // } 
                    // if (msgText.slice(0, 6) == '/file_') {
                    //     return getFile(userID, +msgText.slice(6));
                    // }
                    if (msgText.slice(0, 6) == '/edit_') {
                        messageHistory.push(userMsg);
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
        }