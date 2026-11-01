const startServer = require("./src/server");

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error);
        process.exitCode = 1;
    });
}

module.exports = startServer;