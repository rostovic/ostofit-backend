const { Sequelize } = require("sequelize");

const ostofitDB = new Sequelize("ostofit", "kek", "123456", {
  host: "localhost",
  port: "1433",
  dialect: "mssql",
});

module.exports = ostofitDB;
