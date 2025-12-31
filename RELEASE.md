# How to Create a Release and Provide Downloads

## Quick Start - Create Your First Release

### Option 1: Manual Build (Recommended for First Release)

1. **Build the installer on your local machine:**
   ```bash
   # For Windows
   npm run build:win
   
   # The installer will be in the dist/ folder
   ```

2. **Go to GitHub Releases:**
   - Visit: https://github.com/OmegaNetwork-source/Omega_OS/releases
   - Click "Draft a new release"

3. **Create the release:**
   - **Tag version**: `v1.0.0` (must start with 'v')
   - **Release title**: `Omega OS v1.0.0`
   - **Description**: Copy from README.md or write your own

4. **Upload build files:**
   - Drag and drop files from `dist/` folder:
     - `Omega OS Setup 1.0.0.exe` (Windows installer)
     - `Omega OS-1.0.0-x64.exe` (Windows portable version)
   - Files will be uploaded automatically

5. **Publish the release:**
   - Click "Publish release"
   - Users can now download from the Releases page!

### Option 2: Automated Build (Future Releases)

After your first release, you can use GitHub Actions to automatically build:

1. **Create a new release on GitHub** (same steps as above)
2. **GitHub Actions will automatically:**
   - Build for Windows, macOS, and Linux
   - Upload installers to the release
   - No manual building needed!

**Note**: For macOS and Linux builds to work automatically, the GitHub Actions will run on their respective platforms.

## Building for Multiple Platforms

### Windows
```bash
npm run build:win
```
Output: `dist/Omega OS Setup 1.0.0.exe` and portable version

### macOS (requires Mac)
```bash
npm run build:mac
```
Output: `dist/Omega OS-1.0.0.dmg`

### Linux
```bash
npm run build:linux
```
Output: `dist/Omega OS-1.0.0.AppImage` and `.deb` package

### All Platforms
```bash
npm run build:all
```
(Note: Requires platform-specific tools installed)

## Adding Icons (Optional but Recommended)

1. Create or download a 512x512 PNG logo
2. Convert to required formats:
   - **Windows (.ico)**: Use online converter or ImageMagick
   - **macOS (.icns)**: Use `iconutil` on Mac or online converter
   - **Linux (.png)**: Use your 512x512 PNG directly
3. Place files in `build/` folder:
   - `build/icon.ico`
   - `build/icon.icns`
   - `build/icon.png`

## Release Notes Template

```markdown
## 🎉 Omega OS v1.0.0

### New Features
- 🖥️ Windows 11-style desktop environment
- 🌐 Built-in web browser with privacy features
- 📄 Word processor with rich text editing
- 📊 Spreadsheet with formula support
- 💼 Solana wallet integration
- 🔒 Isolated environment for security

### Download
Choose the installer for your operating system:
- **Windows**: Download `Omega OS Setup.exe` for installer or `Omega OS Portable.exe` for portable version
- **macOS**: Download `Omega OS.dmg`
- **Linux**: Download `Omega OS.AppImage` or `Omega OS.deb`

### System Requirements
- Windows 10/11, macOS 10.13+, or Linux
- 4GB RAM minimum (8GB recommended)
- 500MB disk space
```

## Testing Before Release

1. ✅ Build the installer locally
2. ✅ Install on a clean test machine/VM
3. ✅ Verify all features work correctly
4. ✅ Check that isolated environment is working
5. ✅ Test file operations (save/open)
6. ✅ Verify wallet functionality

## Updating Versions

Before each release, update `package.json`:
```json
{
  "version": "1.0.1"  // Increment version number
}
```

Then commit and push:
```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git push
```

## Troubleshooting

### Build fails with "icon not found"
- Create placeholder icons or use online icon generators
- electron-builder will use default icons if none are provided

### GitHub Actions not building
- Check the Actions tab for error messages
- Ensure workflow file is in `.github/workflows/`
- Verify Node.js version compatibility

### Installer doesn't work
- Test on clean system before releasing
- Check antivirus isn't blocking
- Verify all dependencies are included

## Need Help?

- Check electron-builder docs: https://www.electron.build/
- GitHub Issues: https://github.com/OmegaNetwork-source/Omega_OS/issues

