const { Web3 } = require('web3');
const contractFile = require('./compile');

require('dotenv').config();

// Create Web3 instance
const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.RPC_URL)
);

// Add your account address and private key
// Note: this is for demo purposes only! Never store your private key in a 
// JavaScript file!
const accountFrom = {
  address: process.env.ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
};

// Get the bytecode and API
const bytecode = contractFile.evm.bytecode.object;
const abi = contractFile.abi;

// Create deploy function
const deploy = async () => {
  console.log(`Attempting to deploy from account ${accountFrom.address}`);

  // Create contract instance
  const contract = new web3.eth.Contract(abi);

  // Create constructor transaction and pass in the Pull Oracle contract address
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: ['0xaa2f56843Cec7840F0C106F0202313d8d8CB13d6'],
    // For Moonbeam, use '0x2FA6DbFe4291136Cf272E1A3294362b6651e8517'
  });

  // Sign transaction with PK
  const createTransaction = await web3.eth.accounts.signTransaction(
    {
      data: deployTx.encodeABI(),
      gas: await deployTx.estimateGas(),
      gasPrice: await web3.eth.getGasPrice(),
      nonce: await web3.eth.getTransactionCount(accountFrom.address),
    },
    accountFrom.privateKey
  );

  // Send transaction and wait for receipt
  const createReceipt = await web3.eth.sendSignedTransaction(
    createTransaction.rawTransaction
  );

  console.log(`Contract deployed at address: ${createReceipt.contractAddress}`);
  return { contractAddress: createReceipt.contractAddress, abi }
};

// Export deploy function
module.exports = deploy;