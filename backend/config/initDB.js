const initializeSchema = require("../src/config/initDB");
const { getPool } = require("../src/config/db");

module.exports = () => initializeSchema(getPool());