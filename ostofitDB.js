const { Sequelize } = require("sequelize");

// const ostofitDB = new Sequelize("ostofit", "kek", "123456", {
//   host: "localhost",
//   port: "1433",
//   dialect: "mssql",
// });

const ostofitDB = new Sequelize(
  "ostofit",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mssql",
  }
);

module.exports = ostofitDB;
