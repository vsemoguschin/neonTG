const sequelize = require('../db');
const { DataTypes } = require('sequelize');

// const User = sequelize.define('user', {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//     password: { type: DataTypes.STRING },
//     role: { type: DataTypes.STRING },
//     tg_id: { type: DataTypes.INTEGER, unique: true }
// });

// const UserOrders = sequelize.define('user_orders', {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
// })

// const NewOrders = sequelize.define('new_order', {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
// })

// const WorkOrders = sequelize.define('work_orders', {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
// })

// const DoneOrders = sequelize.define('done_orders', {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
// })


const Order = sequelize.define('order', {
    order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_name: { type: DataTypes.STRING, allowNull: false },
    file_id: { type: DataTypes.STRING, allowNull: false },
    img_id: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    manager_id: { type: DataTypes.INTEGER, allowNull: false },
    manager_name: { type: DataTypes.STRING, allowNull: false },
    neon: { type: DataTypes.STRING, allowNull: false },
    power: { type: DataTypes.INTEGER, allowNull: false },
    dimer: { type: DataTypes.STRING, allowNull: false },
    master_id: { type: DataTypes.INTEGER },
    master_name: { type: DataTypes.STRING },
    condition: { type: DataTypes.STRING, defaultValue: 'Ждёт фрезеровку' },
    is_done: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_important: { type: DataTypes.BOOLEAN, defaultValue: false },
    delivery: { type: DataTypes.STRING },
})

// User.hasOne(UserOrders);
// UserOrders.belongsTo(User)

// UserOrders.hasMany(Order);
// Order.belongsTo.UserOrders;

// Order.hasMany(UserOrders);
// UserOrders.belongsTo(Order)

// NewOrders.hasMany(Order);
// Order.belongsTo.NewOrders;

// WorkOrders.hasMany(Order);
// Order.belongsTo.WorkOrders;

// DoneOrders.hasMany(Order);
// Order.belongsTo.DoneOrders;

module.exports = {
    // User,
    // UserOrders,
    Order,
    // NewOrders,
    // WorkOrders,
    // DoneOrders,
}
