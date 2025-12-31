const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop Window Controls
  desktopMinimize: () => ipcRenderer.send('desktop-minimize'),
  desktopMaximize: () => ipcRenderer.send('desktop-maximize'),
  desktopClose: () => ipcRenderer.send('desktop-close'),
  desktopIsMaximized: () => ipcRenderer.invoke('desktop-is-maximized'),
  
  // App Window Controls
  appWindowMinimize: (windowId) => ipcRenderer.send('app-window-minimize', windowId),
  appWindowMaximize: (windowId) => ipcRenderer.send('app-window-maximize', windowId),
  appWindowClose: (windowId) => ipcRenderer.send('app-window-close', windowId),
  appWindowIsMaximized: (windowId) => ipcRenderer.invoke('app-window-is-maximized', windowId),
  
  // Get current window ID
  getWindowId: () => ipcRenderer.invoke('get-window-id'),
  
  // Listen for window ID
  onWindowId: (callback) => {
    ipcRenderer.on('app-window-id', (event, windowId) => callback(windowId));
  },
  
  // Listen for open file event
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (event, filePath) => callback(filePath));
  },
  
  // App Management
  launchApp: (appType, options) => ipcRenderer.invoke('launch-app', appType, options),
  getOpenWindows: () => ipcRenderer.invoke('get-open-windows'),
  focusWindow: (windowId) => ipcRenderer.invoke('focus-window', windowId),
  
  // Wallet (still available)
  walletCreate: (password, secretKeyBase64 = null) => ipcRenderer.invoke('wallet-create', password, secretKeyBase64),
  walletImportFromPrivateKey: (privateKeyBase58, password) => ipcRenderer.invoke('wallet-import-from-private-key', privateKeyBase58, password),
  walletLoad: (password) => ipcRenderer.invoke('wallet-load', password),
  walletGetBalance: () => ipcRenderer.invoke('wallet-get-balance'),
  walletGetPublicKey: () => ipcRenderer.invoke('wallet-get-public-key'),
  walletSendSol: (toAddress, amount) => ipcRenderer.invoke('wallet-send-sol', toAddress, amount),
  walletHasWallet: () => ipcRenderer.invoke('wallet-has-wallet'),
  walletIsLoaded: () => ipcRenderer.invoke('wallet-is-loaded'),
  walletSignTransaction: (transactionData) => ipcRenderer.invoke('wallet-sign-transaction', transactionData),
  walletSignMessage: (message) => ipcRenderer.invoke('wallet-sign-message', message),
  
  // File operations (isolated environment only)
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  openIsolatedFolder: () => ipcRenderer.invoke('open-isolated-folder'),
  listDocuments: () => ipcRenderer.invoke('list-documents'),
  openFileInApp: (filePath) => ipcRenderer.invoke('open-file-in-app', filePath),
});

