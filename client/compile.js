// Import packages
const fs = require('fs');
const solc = require('solc');

// Get path and load contract
const source = fs.readFileSync('MockOracleClient.sol', 'utf8');

// Create input object
const input = {
   language: 'Solidity',
   sources: {
      'MockOracleClient.sol': {
         content: source,
      },
   },
   settings: {
      outputSelection: {
         '*': {
            '*': ['*'],
         },
      },
   },
};
// Compile the contract
const tempFile = JSON.parse(solc.compile(JSON.stringify(input)));
const contractFile = tempFile.contracts['MockOracleClient.sol']['MockOracleClient'];

// Export contract data
module.exports = contractFile;