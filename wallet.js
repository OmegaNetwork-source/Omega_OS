const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');
const CryptoJS = require('crypto-js');
const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OmegaWallet {
    constructor() {
        // Use devnet for testing - change to mainnet-beta for production
        this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        this.keypair = null;
        // ISOLATED: Store wallet in isolated environment directory, not user home
        const app = require('electron').app || { getPath: () => process.env.APPDATA || os.homedir() };
        const isolatedPath = path.join(app.getPath('userData'), 'isolated-env', 'wallet');
        this.walletPath = isolatedPath;
        this.ensureWalletDirectory();
    }
    
    setNetwork(network) {
        if (network === 'mainnet') {
            this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        } else if (network === 'devnet') {
            this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        }
    }

    ensureWalletDirectory() {
        if (!fs.existsSync(this.walletPath)) {
            fs.mkdirSync(this.walletPath, { recursive: true });
        }
    }

    async createWallet(password, secretKeyBase64 = null) {
        try {
            let keypair;
            let secretKey;
            
            if (secretKeyBase64) {
                // Import existing wallet
                const secretKeyBuffer = Buffer.from(secretKeyBase64, 'base64');
                keypair = Keypair.fromSecretKey(secretKeyBuffer);
                secretKey = secretKeyBase64;
            } else {
                // Generate new wallet
                keypair = Keypair.generate();
                secretKey = Buffer.from(keypair.secretKey).toString('base64');
            }
            
            const publicKey = keypair.publicKey.toString();
            
            // Encrypt secret key
            const encrypted = CryptoJS.AES.encrypt(secretKey, password).toString();
            
            // Save wallet
            const walletData = {
                publicKey: publicKey,
                encryptedSecretKey: encrypted,
                createdAt: Date.now()
            };
            
            const walletFile = path.join(this.walletPath, 'wallet.json');
            fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));
            
            this.keypair = keypair;
            return {
                publicKey: publicKey,
                secretKey: secretKey // Only return once on creation/import
            };
        } catch (error) {
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    async loadWallet(password) {
        try {
            const walletFile = path.join(this.walletPath, 'wallet.json');
            if (!fs.existsSync(walletFile)) {
                return null;
            }

            const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
            
            // Decrypt secret key
            const decrypted = CryptoJS.AES.decrypt(walletData.encryptedSecretKey, password);
            const secretKey = decrypted.toString(CryptoJS.enc.Utf8);
            
            if (!secretKey) {
                throw new Error('Invalid password');
            }

            const secretKeyBuffer = Buffer.from(secretKey, 'base64');
            this.keypair = Keypair.fromSecretKey(secretKeyBuffer);
            
            return {
                publicKey: this.keypair.publicKey.toString()
            };
        } catch (error) {
            throw new Error(`Failed to load wallet: ${error.message}`);
        }
    }

    async getBalance() {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const balance = await this.connection.getBalance(this.keypair.publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async sendSol(toAddress, amount) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const toPublicKey = new PublicKey(toAddress);
            const lamports = amount * LAMPORTS_PER_SOL;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.keypair.publicKey,
                    toPubkey: toPublicKey,
                    lamports: lamports,
                })
            );

            const signature = await this.connection.sendTransaction(
                transaction,
                [this.keypair]
            );

            await this.connection.confirmTransaction(signature, 'confirmed');
            return signature;
        } catch (error) {
            throw new Error(`Failed to send SOL: ${error.message}`);
        }
    }

    getPublicKey() {
        if (!this.keypair) {
            return null;
        }
        return this.keypair.publicKey.toString();
    }

    async signTransaction(transaction) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            transaction.partialSign(this.keypair);
            return transaction;
        } catch (error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
    }

    async signMessage(message) {
        if (!this.keypair) {
            throw new Error('Wallet not loaded');
        }

        try {
            const messageBytes = new TextEncoder().encode(message);
            const signature = await this.keypair.sign(messageBytes);
            return bs58.encode(signature);
        } catch (error) {
            throw new Error(`Failed to sign message: ${error.message}`);
        }
    }

    hasWallet() {
        const walletFile = path.join(this.walletPath, 'wallet.json');
        return fs.existsSync(walletFile);
    }

    isLoaded() {
        return this.keypair !== null;
    }
}

module.exports = OmegaWallet;

