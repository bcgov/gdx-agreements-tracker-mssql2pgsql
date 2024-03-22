const { Connection } = require("tedious");
require("dotenv").config({ path: ".env" });

// Create connection to database
const config = {
  server: process.env.MSSQL_HOST,
  authentication: {
    type: "default",
    options: {
      userName: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
    },
  },
  options: {
    trustServerCertificate: true,
    database: process.env.MSSQL_DB,
  },
};

const connection = new Connection(config);

module.exports = {
  connection,
};
