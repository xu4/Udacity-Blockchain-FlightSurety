var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "salute rubber label force tourist tissue sunset axis grass negative judge rather";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: '*',
      gas: 6721111
    }
  },
  compilers: {
    solc: {
      version: "^0.4.25"
    }
  }
};