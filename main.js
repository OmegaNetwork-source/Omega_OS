const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const OmegaWallet = require('./wallet');

// Set app name early for dialogs and window titles
app.setName('Omega OS');

let desktopWindow; // Main desktop environment window
let appWindows = new Map(); // Track all application windows
let isDev = process.argv.includes('--dev');
let wallet = new OmegaWallet();

// ISOLATED ENVIRONMENT: All data stored in isolated directory
const ISOLATED_DATA_PATH = path.join(app.getPath('userData'), 'isolated-env');
const ISOLATED_DOCUMENTS_PATH = path.join(ISOLATED_DATA_PATH, 'documents');
const fs = require('fs');
if (!fs.existsSync(ISOLATED_DATA_PATH)) {
  fs.mkdirSync(ISOLATED_DATA_PATH, { recursive: true });
}
if (!fs.existsSync(ISOLATED_DOCUMENTS_PATH)) {
  fs.mkdirSync(ISOLATED_DOCUMENTS_PATH, { recursive: true });
}

// SECURITY: Strict session configuration
// Note: File protocol interception disabled - it conflicts with sandbox mode
// File access is already restricted by sandbox mode and context isolation

// VPN/Proxy Configuration
// To use a VPN/proxy, set the OMEGA_PROXY environment variable
// Example: OMEGA_PROXY=socks5://127.0.0.1:1080 npm start
// Or configure a proxy server here:
const PROXY_SERVER = process.env.OMEGA_PROXY || null;

function createDesktopWindow() {
  desktopWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a1a',
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: true, // STRICT SANDBOX MODE
      webviewTag: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false
  });

  desktopWindow.loadFile('desktop.html');

  desktopWindow.once('ready-to-show', () => {
    desktopWindow.show();
    // Only show DevTools in development mode
    if (isDev) {
      desktopWindow.webContents.openDevTools();
    }
  });
  
  // Handle errors
  desktopWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription, validatedURL);
  });

  desktopWindow.on('closed', () => {
    desktopWindow = null;
    // Close all app windows when desktop closes
    appWindows.forEach((win) => win.close());
    appWindows.clear();
  });
}

function createAppWindow(appType, options = {}) {
  let appFile, width, height;
  
  if (appType === 'browser') {
    appFile = 'browser.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'terminal') {
    appFile = 'terminal.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'word') {
    appFile = 'word.html';
    width = options.width || 1000;
    height = options.height || 700;
  } else if (appType === 'sheets') {
    appFile = 'sheets.html';
    width = options.width || 1200;
    height = options.height || 800;
  } else if (appType === 'filemanager') {
    appFile = 'filemanager.html';
    width = options.width || 900;
    height = options.height || 600;
  } else {
    return null;
  }

  const appWindow = new BrowserWindow({
    width: width,
    height: height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    parent: desktopWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: true, // STRICT SANDBOX FOR ALL APPS
      webviewTag: true,
      // VPN/Proxy configuration can be added here
      // For production, you'd configure actual VPN settings
    },
    show: false
  });

  appWindow.loadFile(appFile);
  const windowId = Date.now();
  appWindows.set(windowId, { window: appWindow, type: appType, id: windowId });

  // Send window ID and file path to renderer
  appWindow.webContents.once('did-finish-load', () => {
    appWindow.webContents.send('app-window-id', windowId);
    if (options.filePath) {
      appWindow.webContents.send('open-file', options.filePath);
    }
  });

  appWindow.once('ready-to-show', () => {
    appWindow.show();
  });

  appWindow.on('closed', () => {
    appWindows.delete(windowId);
    // Notify desktop that window closed
    if (desktopWindow && !desktopWindow.isDestroyed()) {
      desktopWindow.webContents.send('app-window-closed', windowId);
    }
  });

  return windowId;
}

// IPC Handlers Setup
function setupIPCHandlers() {
  ipcMain.on('desktop-minimize', () => {
    if (desktopWindow) desktopWindow.minimize();
  });

  ipcMain.on('desktop-maximize', () => {
    if (desktopWindow) {
      if (desktopWindow.isMaximized()) {
        desktopWindow.unmaximize();
      } else {
        desktopWindow.maximize();
      }
    }
  });

  ipcMain.on('desktop-close', () => {
    if (desktopWindow) desktopWindow.close();
  });

  ipcMain.handle('desktop-is-maximized', () => {
    return desktopWindow ? desktopWindow.isMaximized() : false;
  });


  ipcMain.handle('app-window-is-maximized', (event, windowId) => {
    const appData = appWindows.get(windowId);
    return appData && appData.window ? appData.window.isMaximized() : false;
  });

  // Launch Application
  ipcMain.handle('launch-app', (event, appType, options) => {
    return createAppWindow(appType, options);
  });

  ipcMain.handle('get-open-windows', () => {
    const windows = [];
    appWindows.forEach((appData) => {
      windows.push({
        id: appData.id,
        type: appData.type,
        isMaximized: appData.window.isMaximized(),
        isMinimized: appData.window.isMinimized()
      });
    });
    return windows;
  });

  ipcMain.handle('focus-window', (event, windowId) => {
    const appData = appWindows.get(windowId);
    if (appData && appData.window) {
      appData.window.focus();
      if (appData.window.isMinimized()) {
        appData.window.restore();
      }
    }
  });

  // Get window ID from sender
  ipcMain.handle('get-window-id', (event) => {
    // Find window by webContents
    for (const [id, appData] of appWindows.entries()) {
      if (appData.window.webContents.id === event.sender.id) {
        return id;
      }
    }
    return null;
  });
  
  // Auto-detect window ID for app window controls
  ipcMain.on('app-window-minimize', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) appData.window.minimize();
  });

  ipcMain.on('app-window-maximize', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) {
      if (appData.window.isMaximized()) {
        appData.window.unmaximize();
      } else {
        appData.window.maximize();
      }
    }
  });

  ipcMain.on('app-window-close', (event, windowId) => {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      // Auto-detect from sender
      for (const [id, appData] of appWindows.entries()) {
        if (appData.window.webContents.id === event.sender.id) {
          targetWindowId = id;
          break;
        }
      }
    }
    const appData = appWindows.get(targetWindowId);
    if (appData && appData.window) appData.window.close();
  });

  // Wallet IPC Handlers
  ipcMain.handle('wallet-create', async (event, password, secretKeyBase64 = null) => {
    try {
      return await wallet.createWallet(password, secretKeyBase64);
    } catch (error) {
      throw error;
    }
  });
  
  ipcMain.handle('wallet-import-from-private-key', async (event, privateKeyBase58, password) => {
    try {
      const bs58 = require('bs58');
      const { Keypair } = require('@solana/web3.js');
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
      const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      return await wallet.createWallet(password, secretKeyBase64);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-load', async (event, password) => {
    try {
      return await wallet.loadWallet(password);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-balance', async () => {
    try {
      return await wallet.getBalance();
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-get-public-key', () => {
    return wallet.getPublicKey();
  });

  ipcMain.handle('wallet-send-sol', async (event, toAddress, amount) => {
    try {
      return await wallet.sendSol(toAddress, amount);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-has-wallet', () => {
    return wallet.hasWallet();
  });

  ipcMain.handle('wallet-is-loaded', () => {
    return wallet.isLoaded();
  });

  ipcMain.handle('wallet-sign-transaction', async (event, transactionData) => {
    try {
      const { Transaction } = require('@solana/web3.js');
      const transaction = Transaction.from(Buffer.from(transactionData, 'base64'));
      const signed = await wallet.signTransaction(transaction);
      return signed.serialize({ requireAllSignatures: false }).toString('base64');
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('wallet-sign-message', async (event, message) => {
    try {
      return await wallet.signMessage(message);
    } catch (error) {
      throw error;
    }
  });

  // File Operations (isolated environment only)
  ipcMain.handle('save-file-dialog', async (event, options = {}) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(window, {
        title: 'Save File',
        defaultPath: options.defaultPath ? path.join(ISOLATED_DOCUMENTS_PATH, options.defaultPath) : ISOLATED_DOCUMENTS_PATH,
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] }
        ],
        // Restrict to isolated documents directory
        properties: ['createDirectory']
      });
      
      // Validate that the save path is within isolated environment
      if (result.filePath && !result.filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File operations are restricted to the isolated environment');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('open-file-dialog', async (event, options = {}) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window, {
        title: 'Open File',
        defaultPath: ISOLATED_DOCUMENTS_PATH,
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      // Validate that all selected files are within isolated environment
      if (result.filePaths) {
        for (const filePath of result.filePaths) {
          if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
            throw new Error('File operations are restricted to the isolated environment');
          }
        }
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      throw error;
    }
  });

  // Open isolated folder in file explorer (deprecated - use file manager instead)
  ipcMain.handle('open-isolated-folder', async () => {
    try {
      // Instead of opening system explorer, launch file manager window
      return createAppWindow('filemanager');
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // List files in isolated documents folder
  ipcMain.handle('list-documents', async () => {
    try {
      const files = [];
      if (fs.existsSync(ISOLATED_DOCUMENTS_PATH)) {
        const items = fs.readdirSync(ISOLATED_DOCUMENTS_PATH, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(ISOLATED_DOCUMENTS_PATH, item.name);
          const stats = fs.statSync(fullPath);
          files.push({
            name: item.name,
            path: fullPath,
            isDirectory: item.isDirectory(),
            size: stats.size,
            modified: stats.mtime.getTime(),
            extension: path.extname(item.name).toLowerCase()
          });
        }
      }
      // Sort: directories first, then by name
      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      return files;
    } catch (error) {
      throw error;
    }
  });

  // Open file with appropriate app
  ipcMain.handle('open-file-in-app', async (event, filePath) => {
    try {
      // Validate path is within isolated environment
      if (!filePath.startsWith(ISOLATED_DATA_PATH)) {
        throw new Error('File access is restricted to the isolated environment');
      }

      const ext = path.extname(filePath).toLowerCase();
      let appType = null;

      // Determine app based on file extension
      if (['.doc', '.docx', '.txt', '.rtf', '.html', '.htm'].includes(ext)) {
        appType = 'word';
      } else if (['.xls', '.xlsx', '.csv', '.json'].includes(ext)) {
        appType = 'sheets';
      }

      if (appType) {
        const windowId = createAppWindow(appType, { filePath: filePath });
        return { success: true, windowId: windowId };
      } else {
        return { success: false, error: 'Unsupported file type' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// Setup IPC handlers before app is ready
setupIPCHandlers();

app.whenReady().then(() => {
  // Configure proxy/VPN if specified
  if (PROXY_SERVER) {
    session.defaultSession.setProxy({
      proxyRules: PROXY_SERVER
    });
    console.log('VPN/Proxy configured:', PROXY_SERVER);
    
    // Handle Chromium cache errors gracefully when using VPN/Proxy
    // These errors are common with proxy/VPN but don't affect functionality
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      // Filter out common Chromium cache errors that occur with VPN/proxy
      // These are harmless cache corruption issues that Chromium handles automatically
      if (message.includes('backend_impl.cc') || 
          message.includes('entry_impl.cc') ||
          message.includes('Critical error found') ||
          (message.includes('No file for') && message.length < 100)) {
        // Suppress these specific cache errors - they're handled by Chromium
        // Only suppress if it's a short message (to avoid hiding real errors)
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
  }
  
  createDesktopWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDesktopWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

