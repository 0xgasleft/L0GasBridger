require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: __dirname + '/.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    polygon: {
      url: process.env.POLYGON_URL,
      accounts: [process.env.ACCOUNT_PK]
    },
    optimism: {
      url: process.env.OPTIMISM_URL,
      accounts: [process.env.ACCOUNT_PK]
    },
    goerli: {
      url: process.env.ETH_GOERLI_URL,
      accounts: [process.env.ACCOUNT_PK],
    },
    sepolia: {
      url: process.env.ETH_SEPOLIA_URL,
      accounts: [process.env.ACCOUNT_PK],
    },
    fuji: {
      url: process.env.FUJI_URL,
      accounts: [process.env.ACCOUNT_PK],
    },
    opGoerli: {
      url: process.env.OP_GOERLI_URL,
      accounts: [process.env.ACCOUNT_PK],
    },
    mumbai: {
      url: process.env.MUMBAI_URL,
      accounts: [process.env.ACCOUNT_PK],
    },
    lineaGoerli: {
      url: process.env.LINEA_GOERLI_URL,
      accounts: [process.env.ACCOUNT_PK],
    }
  },
  
  
};
