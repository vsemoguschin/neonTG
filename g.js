const checkNeonCode = (code) => {
    let res = {
        neon: [],
        power: 0
    };
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
            res.neon.push(neonWidth + 'мм');
        } else return;
        if (colorCodes[colorCode]) {
            res.neon[i] += ' ' + colorCodes[colorCode];
        } else return;
        if (!isNaN(+neonLength) && +neonLength > 0) {
            res.neon[i] += ` длина ${neonLength * 1}м`;
            res.power += neonLength * 14;
        } else return;
    }
    return res
}

const aboutNeonCodes = `Пример 6к3.5.
Первое значение - толщина неона(6 или 8);
Второе значение - код цвета:
    к - красный,
    с - синий,
    з - зеленый,
    о - оранжевый,
    г - голубой,
    р - розовый,
    б - берюзовый,
    х - холодный белый,
    т - тёплый белый.
Третье значение - длина неона(через точку и один знак после);
6к3.5 читается как неон 6мм красный 3.5 метра.
Если в заказе несколько цветов то через пробел описать способом выше
Например: 6к3.5 6с4.6
` 

console.log(checkNeonCode('6к4'));

