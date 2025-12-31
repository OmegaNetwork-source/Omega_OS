# Omega OS

An isolated desktop environment with a built-in browser, productivity apps, and blockchain wallet integration. Experience a secure, sandboxed workspace that operates independently from your host system.

![Omega OS](https://img.shields.io/badge/Omega-OS-blue)
![Electron](https://img.shields.io/badge/Electron-28.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Core Environment
- 🖥️ **Windows 11-style Desktop** - Modern, clean desktop interface
- 🔒 **Isolated Environment** - Completely sandboxed from your host system
- 🌐 **VPN Integration** - Built-in VPN status and location spoofing
- 📱 **Customizable Desktop** - Change background, arrange icons, personalize

### Built-in Applications
- 🌐 **Omega Browser** - Full-featured web browser with privacy focus
- 📄 **Omega Word** - Word processor with rich text editing
- 📊 **Omega Sheets** - Spreadsheet application with formula support
- 💼 **Omega Wallet** - Multi-chain cryptocurrency wallet (Solana support)

### Security & Privacy
- 🔐 **Strict Sandboxing** - All apps run in isolated sandbox mode
- 🛡️ **File System Isolation** - No access to host file system
- 🌍 **VPN Location Spoofing** - Show different IP addresses and locations
- 🔒 **Encrypted Storage** - Secure wallet key management

## 📥 Download & Install

### For Users
1. Go to [Releases](https://github.com/OmegaNetwork-source/Omega_OS/releases)
2. Download the installer for your operating system:
   - **Windows**: `Omega OS Setup.exe` or `Omega OS Portable.exe`
   - **macOS**: `Omega OS.dmg`
   - **Linux**: `Omega OS.AppImage` or `Omega OS.deb`
3. Run the installer and follow the setup wizard
4. Launch Omega OS from your desktop or Start Menu

### For Developers

1. Clone the repository:
```bash
git clone https://github.com/OmegaNetwork-source/Omega_OS.git
cd Omega_OS
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux

# Build for all platforms
npm run build:all
```

## 🎯 Applications

### Omega Browser
- Full web browsing capabilities
- Tab management
- Privacy-focused search (DuckDuckGo default)
- History, bookmarks, and downloads
- Dark/light theme support

### Omega Word
- Rich text editor
- Font selection and formatting
- Text alignment and styling
- Bullet and numbered lists
- Save/load documents in isolated environment

### Omega Sheets
- Spreadsheet with 100x26 grid
- Formula support (`=A1+B2`, `=SUM(A1:A5)`)
- Cell references and calculations
- Text formatting
- Save/load spreadsheets

### Omega Wallet
- Solana wallet integration
- Create/import wallets
- Send/receive SOL
- dApp browser integration
- Secure key storage

## 🔧 Technical Details

### Architecture
- **Framework**: Electron 28.0
- **Sandboxing**: Strict sandbox mode enabled
- **Context Isolation**: All renderer processes isolated
- **File System**: Isolated data path (`~/.omega-os/isolated-env/`)

### Security
- No node integration in renderer processes
- All IPC communication via context bridge
- File operations restricted to isolated directory
- Secure wallet key encryption

## 📋 System Requirements

- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 10.13 or later
- **Linux**: Ubuntu 18.04+ or equivalent
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for installation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Repository**: [https://github.com/OmegaNetwork-source/Omega_OS](https://github.com/OmegaNetwork-source/Omega_OS)
- **Issues**: [Report a bug](https://github.com/OmegaNetwork-source/Omega_OS/issues)
- **Releases**: [Download latest version](https://github.com/OmegaNetwork-source/Omega_OS/releases)

## ⚠️ Disclaimer

Omega OS is provided "as is" without warranty. Use at your own risk. The isolated environment is designed for security but should not be considered a replacement for proper system security practices.
