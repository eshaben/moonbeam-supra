const PullServiceClient = require('./pullServiceClient');
const { Web3 } = require('web3');
const deploy = require('./deploy');
// Interface for the Oracle Proof data
const OracleProofABI = require('../resources/oracleProof..json'); 
// Interface for the Signed pair cluster data
const SignedCoherentClusterABI = require('../resources/signedCoherentCluster.json');

require('dotenv').config();

// Create a Web3 instance
const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.RPC_URL)
);

// Add your account address and private key
// Note: this is for demo purposes only! Never store your private key in a JavaScript file!
const accountFrom = {
  address: process.env.ADDRESS,
  privateKey: process.env.PRIVATE_KEY
}
const pairIndex = 1;

// Function that fetches proof data from the gRPC server using the specified parameters and 
// then calls the Mock Oracle Client contract function on Moonbase Alpha (or Moonbeam)
async function main() {
  // Set the gRPC server address
  // For Moonbeam, use mainnet-dora.supraoracles.com
  const address = 'testnet-dora.supraoracles.com'; // gRPC server address for Moonbase Alpha
  const client = new PullServiceClient(address);

  const request = {
    pair_indexes: [pairIndex], // Set the pair indexes as an array,
    chain_type: 'evm',
  };
  console.log('Requesting proof for price index : ', request.pair_indexes);
  client.getProof(request, (err, response) => {
    if (err) {
      console.error('Error:', err.details);
      return;
    }
    console.log('Calling contract to verify the proofs.. ');
    callContract(response.evm);
  });
}

// Function that deserializes the oracle proof bytes and prints human-readable data about the 
// price data to the terminal
async function deserializeProofBytes(hex) {
  const proof_data = web3.eth.abi.decodeParameters(OracleProofABI, hex);
  const clusters = proof_data[0].clustersRaw; // Fatching the raw bytes of the signed pair cluster data
  const pairMask = proof_data[0].pairMask; // Fetching which pair IDs have been requested
  let pair = 0; // Helps in iterating the vector of pair masking
  const pairId = []; // List of all the pair IDs requested
  const pairPrice = []; // List of prices for the corresponding pair IDs
  const pairDecimal = []; // List of pair decimals for the corresponding pair IDs
  const pairTimestamp = []; // List of pair last updated timestamp for the corresponding pair IDs

  for (let i = 0; i < clusters.length; ++i) {
    // Deserialize the raw bytes of the signed pair cluster data
    const scc = web3.eth.abi.decodeParameters(
      SignedCoherentClusterABI,
      clusters[i]
    );

    for (let j = 0; j < scc[0].cc.pair.length; ++j) {
      pair += 1;
      // Verify whether the pair is requested or not
      if (!pairMask[pair - 1]) {
        continue;
      }
      pairId.push(scc[0].cc.pair[j].toString(10)); // Pushing the pair IDs requested in the output vector
      pairPrice.push(scc[0].cc.prices[j].toString(10)); // Pushing the pair price for the corresponding IDs
      pairDecimal.push(scc[0].cc.decimals[j].toString(10)); // Pushing the pair decimals for the corresponding IDs requested
      pairTimestamp.push(scc[0].cc.timestamp[j].toString(10)); // Pushing the pair timestamp for the corresponding IDs requested
    }
  }

  console.log('----- Deserialized Data ------');
  console.log('Pair index : ', pairId);
  console.log('Pair Price : ', pairPrice);
  console.log('Pair Decimal : ', pairDecimal);
  console.log('Pair Timestamp : ', pairTimestamp);
  console.log('------------------------------');
}

// Function that calls the GetPairPrice functon of the Mock Oracle Client contract on Moonbase Alpha 
// (or Moonbeam)
async function callContract(response) {
  // Convert oracle proof bytes to hex
  const hex = web3.utils.bytesToHex(response.proof_bytes);

  // Utility code to deserialize the oracle proof bytes (Optional)
  deserializeProofBytes(hex);

  // Deploy the Mock Oracle Client contract
  const { contractAddress, abi } = await deploy();

  // Create contract instance of the Mock Oracle Client contract
  const contract = new web3.eth.Contract(abi, contractAddress);

  // Call GetPairPrice from the Mock Oracle Client contract
  const txData = contract.methods.GetPairPrice(hex, pairIndex).encodeABI();
  const gasEstimate = await contract.methods
    .GetPairPrice(hex, pairIndex)
    .estimateGas();

  // Create the transaction object
  const transactionObject = {
    from: accountFrom.address,
    to: contractAddress,
    data: txData,
    gas: gasEstimate,
    gasPrice: await web3.eth.getGasPrice(),
  };

  // Sign the transaction with the private key
  const signedTransaction = await web3.eth.accounts.signTransaction(
    transactionObject,
    accountFrom.privateKey
  );

  // Send the signed transaction
  const receipt = await web3.eth.sendSignedTransaction(
    signedTransaction.rawTransaction
  );
  console.log('Transaction receipt:', receipt);
}

main();
