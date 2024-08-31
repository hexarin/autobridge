const { ethers } = require('ethers');
const prompt = require('prompt-sync')();
require('dotenv').config();

const RPC_URL_BASE = 'URL_BASE_SEPOLIA'; // Ganti dengan URL RPC Base Sepolia
const RPC_URL_ARBITRUM = 'URL_ARBITRUM_SEPOLIA'; // Ganti dengan URL RPC Arbitrum Sepolia
const CHAIN_ID_BASE = 84531; // Ganti dengan Chain ID Base Sepolia
const CHAIN_ID_ARBITRUM = 421613; // Ganti dengan Chain ID Arbitrum Sepolia

const providerBase = new ethers.JsonRpcProvider(RPC_URL_BASE, CHAIN_ID_BASE);
const providerArbitrum = new ethers.JsonRpcProvider(RPC_URL_ARBITRUM, CHAIN_ID_ARBITRUM);

// Alamat kontrak bridge dan remote orders
const bridgeContractAddress = '0x30A0155082629940d4bd9Cd41D6EF90876a0F1b5'; // Address bridge di Base Sepolia
const remoteOrderContractAddress = '0x8D86c3573928CE125f9b2df59918c383aa2B514D'; // Address remote orders di Arbitrum Sepolia

async function getContractABI(contractAddress, provider) {
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        throw new Error(`Contract not found at address: ${contractAddress}`);
    }
    const contractABI = await provider.getContractAt(contractAddress).then((contract) => contract.interface.format(ethers.utils.FormatTypes.json));
    return JSON.parse(contractABI);
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

    wallets = wallets.map((wallet) => wallet.connect(providerBase));

    const bridgeAmount = prompt('How much ETH do you want to bridge (in ETH): ');
    const amountInWei = ethers.parseUnits(bridgeAmount, 'ether');

    // Mengambil ABI secara otomatis menggunakan ethers.js
    const bridgeABI = await getContractABI(bridgeContractAddress, providerBase);
    const remoteOrderABI = await getContractABI(remoteOrderContractAddress, providerArbitrum);

    const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, providerBase);
    const remoteOrderContract = new ethers.Contract(remoteOrderContractAddress, remoteOrderABI, providerArbitrum);

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const balance = await providerBase.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        console.log(`Wallet ${wallet.address} balance: ${balanceInEth} ETH`);

        if (parseFloat(balanceInEth) <= 0) {
            console.error(`Wallet ${wallet.address} Insufficient balance. Skipping transactions for this wallet.`);
            continue;
        }

        try {
            const tx = await bridgeContract.connect(wallet).bridge(
                wallet.address, // Ganti sesuai dengan parameter yang dibutuhkan
                remoteOrderContractAddress,
                amountInWei,
                {
                    gasLimit: 5000000, // Sesuaikan dengan gas limit yang diperlukan
                    gasPrice: await providerBase.getGasPrice(),
                }
            );
            console.log(`Bridged ${bridgeAmount} ETH from ${wallet.address} on Base Sepolia to Arbitrum Sepolia.`);
            console.log(`Tx Hash: ${tx.hash}`);
        } catch (error) {
            console.error(`Failed to bridge from ${wallet.address}:`, error);
        }
    }
}

main().catch((error) => {
    console.error('Error running the bot:', error);
});
