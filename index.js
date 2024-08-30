const { ethers } = require('ethers');
const prompt = require('prompt-sync')();
require('dotenv').config();

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

const BRIDGE_ABIS = {
    base: [
        {"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
        {"stateMutability":"payable","type":"fallback"},
        {"stateMutability":"payable","type":"receive"}
    ],
    arb: [
        {"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
        {"stateMutability":"payable","type":"fallback"},
        {"stateMutability":"payable","type":"receive"}
    ],
    blast: [
        {"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
        {"stateMutability":"payable","type":"fallback"},
        {"stateMutability":"payable","type":"receive"}
    ],
    op: [
        {"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"admin_","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
        {"stateMutability":"payable","type":"fallback"},
        {"stateMutability":"payable","type":"receive"}
    ]
};

function getProvider(chain) {
    return new ethers.JsonRpcProvider(RPC_URLS[chain], CHAIN_IDS[chain]);
}

async function bridge(fromChain, toChain, amount, wallet) {
    const provider = getProvider(fromChain);
    const bridgeContract = new ethers.Contract(BRIDGE_CONTRACTS[fromChain], BRIDGE_ABIS[fromChain], wallet);

    // Ensure 'bridge' method and parameters are correct
    const txData = bridgeContract.interface.encodeFunctionData('bridge', [amount, toChain]);
    const gasPrice = await provider.getFeeData().then(feeData => feeData.gasPrice);
    const nonce = await provider.getTransactionCount(wallet.address);

    const tx = {
        to: BRIDGE_CONTRACTS[fromChain],
        gasLimit: 2000000,
        gasPrice: gasPrice,
        nonce: nonce,
        data: txData
    };

    try {
        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait(); // Wait for the transaction to be mined

        // Extract orderId from transaction receipt logs
        const receipt = await provider.getTransactionReceipt(txResponse.hash);
        const orderId = receipt.logs.find(log => log.topics.length > 0)?.topics[1] || null;

        return {
            transactionHash: txResponse.hash,
            orderId: orderId
        };
    } catch (error) {
        console.error(`Failed to bridge from ${wallet.address}:`, error);
        throw error;
    }
}

async function main() {
    const seedPhrases = JSON.parse(process.env.SEED_PHRASES || '[]');
    const privateKeys = JSON.parse(process.env.PRIVATE_KEYS || '[]');

    let wallets = [];
    seedPhrases.forEach((mnemonic) => {
        wallets.push(ethers.Wallet.fromPhrase(mnemonic.trim()));
    });
    privateKeys.forEach((privateKey) => {
        wallets.push(new ethers.Wallet(privateKey.trim()));
    });

    if (wallets.length === 0) {
        console.error('No wallets found');
        process.exit(1);
    }

    wallets = wallets.map((wallet) => wallet.connect(getProvider('base'))); // Connect to a default provider for wallet setup

    const amountToBridge = prompt('How much ETH do you want to bridge (in ETH): ');
    const numIterations = parseInt(prompt('How many iterations do you want to perform: '), 10);

    const amountInWei = ethers.parseUnits(amountToBridge, 'ether');
    const delayBetweenTransactions = 4000;

    for (let i = 0; i < numIterations; i++) {
        const fromChain = Object.keys(RPC_URLS)[Math.floor(Math.random() * Object.keys(RPC_URLS).length)];
        let toChain;
        do {
            toChain = Object.keys(RPC_URLS)[Math.floor(Math.random() * Object.keys(RPC_URLS).length)];
        } while (toChain === fromChain); // Ensure fromChain and toChain are different

        for (let wallet of wallets) {
            try {
                console.log(`Bridging from ${fromChain} to ${toChain}...`);
                const result = await bridge(fromChain, toChain, amountInWei, wallet);
                console.log(`Transaction hash: ${result.transactionHash}`);
                console.log(`Order ID: ${result.orderId}`);
            } catch (error) {
                console.error(`Error: ${error}`);
            }

            await new Promise(resolve => setTimeout(resolve, delayBetweenTransactions)); // Wait before next bridge
        }
    }
}

main();
