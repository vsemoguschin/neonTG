//Кнопка отмены
const cancelOption = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: 'Отменить' }],
        ],
        resize_keyboard: true,
        hide_keyboard: true
    })
};

//Меню менеджера
//https://api.telegram.org/bot5575099005:AAFREUhpqvo12MIMn-8OumJylxogNkEV1us/sendMessage?chat_id=317401874&text=Enter%20your%20text%20here&reply_markup=%7B%22keyboard%22:[[%7B%22text%22:%22Создать%20заказ%22%7D],[%7B%22text%22:%22Все%20заказы%22%7D],[%7B%22text%22:%22Мои%20заказы%22%7D],[%7B%22text%22:%22Назад%20в%20меню%22%7D]]%7D
const managerMenu = {
    reply_markup: JSON.stringify(
        {
            keyboard: [
                [{ text: 'Создать заказ' }],
                [{ text: 'Все заказы' }, { text: 'Мои заказы' }],
            ],
            resize_keyboard: true,
            hide_keyboard: true
        }
    )
}

module.exports = {cancelOption, managerMenu};