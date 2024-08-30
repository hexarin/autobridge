const Web3 = require('web3');
const { PRIVATE_KEY, WALLET_ADDRESS, ITERATIONS, INTERVAL } = process.env;

// Configuration
const RPC_URLS = {
    base: 'https://base-sepolia-rpc.publicnode.com',
    arb: 'https://arbitrum-sepolia.infura.io/v3/a9068de0f8564411a3c7aeb6f2fb0c3e',
    blast: 'https://sepolia.blast.io',
    op: 'https://optimism-sepolia.blockpi.network/v1/rpc/public'
};

const CHAIN_IDS = {
    base: 84532,
    arb: 421614,
    blast: 168587773,
    op: 11155420
};

const BRIDGE_CONTRACTS = {
    base: '0x30A0155082629940d4bd9Cd41D6EF90876a0F1b5',
    arb: '0x8D86c3573928CE125f9b2df59918c383aa2B514D',
    blast: '0x1D5FD4ed9bDdCCF5A74718B556E9d15743cB26A2',
    op: '0xF221750e52aA080835d2957F2Eed0d5d7dDD8C38'
};

// ABI for all chains (Replace with actual ABI if different for each chain)
const BRIDGE_ABIS = {
    base: [{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"payable","type":"receive"}],
    arb: [{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"payable","type":"receive"}],
    blast: [{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"payable","type":"receive"}],
    op: [{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"payable","type":"receive"}]
};

function getWeb3(chain) {
    return new Web3(new Web3.providers.HttpProvider(RPC_URLS[chain]));
}

// Function to extract orderId from transaction receipt logs
function extractOrderId(logs) {
    for (const log of logs) {
        const topics = log.topics;
        if (topics.length > 0) {
            // Assuming the orderId is in the second topic (1-indexed) in this example
            return topics[1];
        }
    }
    return null;
}

async function bridge(fromChain, toChain, amount) {
    const web3 = getWeb3(fromChain);
    const bridgeContract = new web3.eth.Contract(BRIDGE_ABIS[fromChain], BRIDGE_CONTRACTS[fromChain]);

    // Make sure 'bridge' method and parameters are correct
    const txData = bridgeContract.methods.bridge(amount, toChain).encodeABI();
    const gasPrice = await web3.eth.getGasPrice();
    const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS);

    const tx = {
        from: WALLET_ADDRESS,
        to: BRIDGE_CONTRACTS[fromChain],
        gas: 2000000,
        gasPrice: gasPrice,
        nonce: nonce,
        data: txData
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    // Extract orderId from the transaction receipt logs
    const orderId = extractOrderId(txReceipt.logs);
    return {
        transactionHash: txReceipt.transactionHash,
        orderId: orderId
    };
}

async function main() {
    const chains = Object.keys(RPC_URLS);
    let iterationCount = 0;

    while (iterationCount < ITERATIONS) {
        const fromChain = chains[Math.floor(Math.random() * chains.length)];
        let toChain;
        do {
            toChain = chains[Math.floor(Math.random() * chains.length)];
        } while (toChain === fromChain); // Ensure fromChain and toChain are different

        try {
            console.log(`Bridging from ${fromChain} to ${toChain}...`);
            const result = await bridge(fromChain, toChain, Web3.utils.toWei('1', 'ether')); // Adjust amount as needed
            console.log(`Transaction hash: ${result.transactionHash}`);
            console.log(`Order ID: ${result.orderId}`);
        } catch (error) {
            console.error(`Error: ${error}`);
        }

        iterationCount++;
        await new Promise(resolve => setTimeout(resolve, INTERVAL)); // Wait before next bridge
    }
}

main();
