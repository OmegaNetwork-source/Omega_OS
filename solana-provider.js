// Solana Provider Injection for dApp Integration
(function() {
    'use strict';

    // Provider injection script to be injected into webviews
    const providerScript = `
        (function() {
            if (window.solana && window.solana.isOmega) return;
            
            class OmegaSolanaProvider {
                constructor() {
                    this.isConnected = false;
                    this.publicKey = null;
                    this.listeners = {};
                    this.isPhantom = false;
                    this.isOmega = true;
                }
                
                async connect(opts) {
                    return new Promise((resolve, reject) => {
                        window.postMessage({ 
                            type: 'OMEGA_WALLET_REQUEST',
                            action: 'connect',
                            id: Date.now()
                        }, '*');
                        
                        const handler = (event) => {
                            if (event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'connect') {
                                window.removeEventListener('message', handler);
                                if (event.data.error) {
                                    reject(new Error(event.data.error));
                                } else {
                                    this.publicKey = event.data.publicKey;
                                    this.isConnected = true;
                                    this.emit('connect', { publicKey: this.publicKey });
                                    resolve({ publicKey: this.publicKey });
                                }
                            }
                        };
                        window.addEventListener('message', handler);
                        
                        setTimeout(() => {
                            window.removeEventListener('message', handler);
                            reject(new Error('Connection timeout'));
                        }, 30000);
                    });
                }
                
                async disconnect() {
                    this.isConnected = false;
                    this.publicKey = null;
                    this.emit('disconnect');
                }
                
                async signTransaction(transaction) {
                    if (!this.isConnected) throw new Error('Wallet not connected');
                    
                    return new Promise((resolve, reject) => {
                        const serialized = transaction.serialize({ requireAllSignatures: false });
                        const base64 = btoa(String.fromCharCode(...serialized));
                        const id = Date.now();
                        
                        window.postMessage({ 
                            type: 'OMEGA_WALLET_REQUEST',
                            action: 'signTransaction',
                            data: base64,
                            id: id
                        }, '*');
                        
                        const handler = (event) => {
                            if (event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'signTransaction' && event.data.id === id) {
                                window.removeEventListener('message', handler);
                                if (event.data.error) {
                                    reject(new Error(event.data.error));
                                } else {
                                    const { Transaction } = window.solanaWeb3 || {};
                                    if (Transaction) {
                                        const signed = Uint8Array.from(atob(event.data.data), c => c.charCodeAt(0));
                                        resolve(Transaction.from(signed));
                                    } else {
                                        reject(new Error('Solana web3.js not loaded'));
                                    }
                                }
                            }
                        };
                        window.addEventListener('message', handler);
                    });
                }
                
                async signAllTransactions(transactions) {
                    const signed = [];
                    for (const tx of transactions) {
                        signed.push(await this.signTransaction(tx));
                    }
                    return signed;
                }
                
                async signMessage(message, encoding = 'utf8') {
                    if (!this.isConnected) throw new Error('Wallet not connected');
                    
                    return new Promise((resolve, reject) => {
                        const messageStr = typeof message === 'string' ? message : new TextDecoder(encoding).decode(message);
                        const id = Date.now();
                        
                        window.postMessage({ 
                            type: 'OMEGA_WALLET_REQUEST',
                            action: 'signMessage',
                            data: messageStr,
                            id: id
                        }, '*');
                        
                        const handler = (event) => {
                            if (event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'signMessage' && event.data.id === id) {
                                window.removeEventListener('message', handler);
                                if (event.data.error) {
                                    reject(new Error(event.data.error));
                                } else {
                                    resolve({ signature: Uint8Array.from(atob(event.data.data), c => c.charCodeAt(0)) });
                                }
                            }
                        };
                        window.addEventListener('message', handler);
                    });
                }
                
                on(event, callback) {
                    if (!this.listeners[event]) this.listeners[event] = [];
                    this.listeners[event].push(callback);
                }
                
                removeListener(event, callback) {
                    if (this.listeners[event]) {
                        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
                    }
                }
                
                emit(event, data) {
                    if (this.listeners[event]) {
                        this.listeners[event].forEach(callback => callback(data));
                    }
                }
            }
            
            window.solana = new OmegaSolanaProvider();
        })();
    `;

    // Inject provider into webviews
    function injectProvider(webview) {
        webview.addEventListener('dom-ready', () => {
            webview.executeJavaScript(providerScript);
            
            // Handle messages from webview
            webview.addEventListener('ipc-message', (event) => {
                if (event.channel === 'wallet-request') {
                    handleWalletRequest(webview, event.args[0]);
                }
            });
        });
        
        // Listen for postMessage from webview content
        webview.addEventListener('console-message', (e) => {
            // This won't work directly, need to use IPC
        });
    }
    
    // Handle wallet requests from webviews
    async function handleWalletRequest(webview, request) {
        try {
            let response;
            
            switch (request.action) {
                case 'connect':
                    const publicKey = await window.electronAPI.walletGetPublicKey();
                    if (!publicKey) {
                        response = { error: 'Wallet not unlocked. Please unlock Omega Wallet first.' };
                    } else {
                        response = { publicKey: publicKey };
                    }
                    break;
                    
                case 'signTransaction':
                    const signedTx = await window.electronAPI.walletSignTransaction(request.data);
                    response = { data: signedTx };
                    break;
                    
                case 'signMessage':
                    const signature = await window.electronAPI.walletSignMessage(request.data);
                    response = { data: signature };
                    break;
                    
                default:
                    response = { error: 'Unknown action' };
            }
            
            // Send response back to webview
            webview.send('wallet-response', { ...response, id: request.id, action: request.action });
        } catch (error) {
            webview.send('wallet-response', { error: error.message, id: request.id, action: request.action });
        }
    }

    // Monitor for new webviews and inject provider
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'WEBVIEW') {
                    injectProvider(node);
                }
            });
        });
    });

    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
            document.querySelectorAll('webview').forEach(injectProvider);
        });
    } else {
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('webview').forEach(injectProvider);
    }
})();

