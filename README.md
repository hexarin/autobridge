Feel free donate to my EVM and Solana address

EVM :

```bash
0xF6cef2b3C79FEF0E31FA38f0b2abaF9a59172fc5
```

SOL :

```bash
Bn2oToZMmVW3cC7c4kaBZ36DMrkQEd5WaMk42GjedtrS
```


### 1. Clone Repositori

```bash
git clone https://github.com/hexarin/autobridge.git
cd autobridge
```

### 2. Instal Dependensi

```bash
npm install
```
### 3. Change RPC & CHAIN ID

```bash
nano index.js
```

### 4. Konfigurasi .env File

buat file .env di root projek

```bash
PRIVATE_KEY=YOUR_PRIVATE_KEY
WALLET_ADDRESS=YOUR_WALLET_ADDRESS
ITERATIONS=10  # Jumlah iterasi bridging yang diinginkan
INTERVAL=60000  # Waktu tunggu antar iterasi dalam milidetik (misalnya, 60000 ms = 1 menit)
```

### 5. Run script

```bash
npm run start
```

\*pastikan udah install node js
