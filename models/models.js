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
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    owner: { type: DataTypes.INTEGER, allowNull: false },
    master_id: { type: DataTypes.INTEGER },
    master_name: { type: DataTypes.STRING },
    // file: { type: DataTypes.INTEGER, allowNull: false },
    msg_file_id: { type: DataTypes.INTEGER, allowNull: false },
    msg_desc_id: { type: DataTypes.INTEGER, allowNull: false },
    condition: { type: DataTypes.INTEGER, defaultValue: 0 },
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
