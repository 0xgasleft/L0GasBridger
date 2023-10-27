const { sendProcess } = require("./sender_helper.js");




sendProcess().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });