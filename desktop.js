// Desktop Environment Script
let startMenuOpen = false;
let openWindows = new Map();
let activeWindowId = null;

// Background Management
function loadBackground() {
    const bgType = localStorage.getItem('desktopBgType') || 'color';
    const bgValue = localStorage.getItem('desktopBgValue') || '#1a1a1a';
    
    const wallpaper = document.querySelector('.desktop-wallpaper');
    if (bgType === 'image' && bgValue) {
        wallpaper.style.backgroundImage = `url(${bgValue})`;
        wallpaper.style.backgroundSize = 'cover';
        wallpaper.style.backgroundPosition = 'center';
        wallpaper.style.backgroundColor = 'transparent';
    } else {
        wallpaper.style.backgroundImage = 'none';
        wallpaper.style.backgroundColor = bgValue;
    }
}

function saveBackground(type, value) {
    localStorage.setItem('desktopBgType', type);
    localStorage.setItem('desktopBgValue', value);
    loadBackground();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Desktop environment initializing...');
    initializeDesktop();
    loadBackground(); // Load saved background
    updateTime();
    setInterval(updateTime, 1000);
    
    // Listen for window state updates from main process
    if (window.electronAPI) {
        console.log('Electron API available');
        // Request initial window state
        updateTaskbar();
        
        // Listen for window events
        window.addEventListener('app-window-closed', (event) => {
            const windowId = event.detail;
            openWindows.delete(windowId);
            updateTaskbar();
        });
    } else {
        console.error('Electron API not available!');
    }
});

function setupDesktopIcons() {
    // Load saved icon positions
    loadIconPositions();
    
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    desktopIcons.forEach(icon => {
        // Click events
        icon.addEventListener('click', (e) => {
            if (!icon.classList.contains('dragging')) {
                // Deselect all icons
                document.querySelectorAll('.desktop-icon').forEach(i => {
                    i.classList.remove('selected');
                });
                icon.classList.add('selected');
            }
        });
        
        // Double-click to launch
        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const appType = icon.dataset.app;
            const action = icon.dataset.action;
            
            if (appType) {
                launchApp(appType);
            } else if (action === 'open-folder') {
                // Open file manager window
                launchApp('filemanager');
            }
        });
        
        // Drag and drop
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let initialX = 0;
        let initialY = 0;
        
        icon.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button only
                isDragging = true;
                icon.classList.add('dragging');
                
                // Get current position
                const rect = icon.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                // Get mouse position
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && icon.classList.contains('dragging')) {
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                let newX = initialX + deltaX;
                let newY = initialY + deltaY;
                
                // Constrain to desktop area (above taskbar)
                const maxX = window.innerWidth - icon.offsetWidth - 20;
                const maxY = window.innerHeight - 48 - icon.offsetHeight - 20; // 48px taskbar
                
                newX = Math.max(20, Math.min(newX, maxX));
                newY = Math.max(20, Math.min(newY, maxY));
                
                icon.style.left = newX + 'px';
                icon.style.top = newY + 'px';
                
                // Save position
                saveIconPosition(icon.id, newX, newY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                icon.classList.remove('dragging');
            }
        });
        
        // Touch events for mobile support
        icon.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                icon.classList.add('dragging');
                
                const rect = icon.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging && icon.classList.contains('dragging') && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - dragStartX;
                const deltaY = e.touches[0].clientY - dragStartY;
                
                let newX = initialX + deltaX;
                let newY = initialY + deltaY;
                
                const maxX = window.innerWidth - icon.offsetWidth - 20;
                const maxY = window.innerHeight - 48 - icon.offsetHeight - 20;
                
                newX = Math.max(20, Math.min(newX, maxX));
                newY = Math.max(20, Math.min(newY, maxY));
                
                icon.style.left = newX + 'px';
                icon.style.top = newY + 'px';
                
                saveIconPosition(icon.id, newX, newY);
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                icon.classList.remove('dragging');
            }
        });
    });
}

function loadIconPositions() {
    const icons = document.querySelectorAll('.desktop-icon');
    const savedPositions = JSON.parse(localStorage.getItem('desktopIconPositions') || '{}');
    
    // Default grid layout
    const gridCols = 4;
    const iconWidth = 80;
    const iconHeight = 90;
    const spacing = 30;
    const startX = 20;
    const startY = 20;
    
    icons.forEach((icon, index) => {
        const iconId = icon.id;
        
        if (savedPositions[iconId]) {
            // Use saved position
            icon.style.left = savedPositions[iconId].x + 'px';
            icon.style.top = savedPositions[iconId].y + 'px';
        } else {
            // Use default grid position
            const col = index % gridCols;
            const row = Math.floor(index / gridCols);
            const x = startX + col * (iconWidth + spacing);
            const y = startY + row * (iconHeight + spacing);
            
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            saveIconPosition(iconId, x, y);
        }
    });
}

function saveIconPosition(iconId, x, y) {
    const positions = JSON.parse(localStorage.getItem('desktopIconPositions') || '{}');
    positions[iconId] = { x, y };
    localStorage.setItem('desktopIconPositions', JSON.stringify(positions));
}

function initializeDesktop() {
    // Start Button
    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStartMenu();
    });
    
    // Close start menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            closeStartMenu();
        }
    });
    
    // Desktop Icons - Load positions and setup drag
    setupDesktopIcons();
    
    // Start Menu Items
    const startMenuItems = document.querySelectorAll('.start-menu-item');
    startMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const appType = item.dataset.app;
            const action = item.dataset.action;
            if (appType) {
                launchApp(appType);
                closeStartMenu();
            } else if (action === 'open-folder') {
                launchApp('filemanager');
                closeStartMenu();
            }
        });
    });
    
    // Start Menu Search
    setupStartMenuSearch();
    
    // Power Button
    const powerButton = document.getElementById('powerButton');
    powerButton.addEventListener('click', () => {
        if (confirm('Exit isolated environment?')) {
            window.electronAPI?.desktopClose();
        }
    });
    
    // Context Menu
    setupContextMenu();
    
    // Color Picker
    setupColorPicker();
    
    // Image Upload
    setupImageUpload();
}

function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const desktopBackground = document.querySelector('.desktop-background');
    const desktopIcons = document.querySelector('.desktop-icons');
    
    document.addEventListener('contextmenu', (e) => {
        // Allow context menu on desktop area, but not on taskbar/menus
        if (e.target.closest('.taskbar') || 
            e.target.closest('.start-menu') || 
            e.target.closest('.context-menu') ||
            e.target.closest('.color-picker-modal')) {
            return;
        }
        
        // Only show on desktop background or icons
        if (e.target.closest('.desktop-background') || e.target.closest('.desktop-icons')) {
            e.preventDefault();
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.classList.add('active');
        }
    });
    
    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            contextMenu.classList.remove('active');
            contextMenu.style.display = 'none';
        }
    });
    
    // Change Background Color
    document.getElementById('changeBackgroundColor').addEventListener('click', () => {
        const modal = document.getElementById('colorPickerModal');
        modal.classList.add('active');
        contextMenu.classList.remove('active');
    });
    
    // Upload Background Image
    document.getElementById('uploadBackgroundImage').addEventListener('click', () => {
        document.getElementById('imageUploadInput').click();
        contextMenu.classList.remove('active');
    });
    
    // Reset Background
    document.getElementById('resetBackground').addEventListener('click', () => {
        saveBackground('color', '#1a1a1a');
        contextMenu.classList.remove('active');
    });
}

function setupColorPicker() {
    const modal = document.getElementById('colorPickerModal');
    const closeBtn = document.getElementById('closeColorPicker');
    const cancelBtn = document.getElementById('cancelColorPicker');
    const applyBtn = document.getElementById('applyColorPicker');
    const customPicker = document.getElementById('customColorPicker');
    
    let selectedColor = '#1a1a1a';
    
    // Close modal
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            selectedColor = preset.dataset.color;
            customPicker.value = selectedColor;
            // Visual feedback
            document.querySelectorAll('.color-preset').forEach(p => {
                p.style.borderColor = 'transparent';
            });
            preset.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });
    });
    
    // Custom color picker
    customPicker.addEventListener('change', (e) => {
        selectedColor = e.target.value;
        document.querySelectorAll('.color-preset').forEach(p => {
            p.style.borderColor = 'transparent';
        });
    });
    
    // Apply color
    applyBtn.addEventListener('click', () => {
        saveBackground('color', selectedColor);
        modal.classList.remove('active');
    });
}

function setupImageUpload() {
    const input = document.getElementById('imageUploadInput');
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                saveBackground('image', imageData);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        input.value = '';
    });
}

function toggleStartMenu() {
    startMenuOpen = !startMenuOpen;
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startButton');
    
    if (startMenuOpen) {
        startMenu.classList.add('active');
        startButton.classList.add('active');
    } else {
        startMenu.classList.remove('active');
        startButton.classList.remove('active');
    }
}

function closeStartMenu() {
    startMenuOpen = false;
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startButton');
    startMenu.classList.remove('active');
    startButton.classList.remove('active');
}

async function launchApp(appType) {
    try {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return;
        }
        
        const windowId = await window.electronAPI.launchApp(appType, {
            width: 1200,
            height: 800
        });
        
        if (windowId) {
            openWindows.set(windowId, {
                id: windowId,
                type: appType,
                name: getAppName(appType)
            });
            activeWindowId = windowId;
            updateTaskbar();
        }
    } catch (error) {
        console.error('Failed to launch app:', error);
        alert('Failed to launch application: ' + error.message);
    }
}

function getAppName(appType) {
    const names = {
        'browser': 'Omega Browser',
        'terminal': 'Terminal'
    };
    return names[appType] || appType;
}

function getAppIcon(appType) {
    const icons = {
        'browser': '🌐',
        'terminal': '💻'
    };
    return icons[appType] || '📄';
}

async function updateTaskbar() {
    if (!window.electronAPI) return;
    
    try {
        const windows = await window.electronAPI.getOpenWindows();
        const taskbarApps = document.getElementById('taskbarApps');
        
        // Clear taskbar
        taskbarApps.innerHTML = '';
        
        // Add each window to taskbar
        windows.forEach(win => {
            const taskbarApp = document.createElement('div');
            taskbarApp.className = 'taskbar-app';
            if (win.id === activeWindowId) {
                taskbarApp.classList.add('active');
            }
            
            taskbarApp.innerHTML = `
                <div class="taskbar-app-icon">${getAppIcon(win.type)}</div>
                <span>${getAppName(win.type)}</span>
            `;
            
            taskbarApp.addEventListener('click', () => {
                window.electronAPI?.focusWindow(win.id);
                activeWindowId = win.id;
                updateTaskbar();
            });
            
            taskbarApps.appendChild(taskbarApp);
        });
        
        // Update openWindows map
        openWindows.clear();
        windows.forEach(win => {
            openWindows.set(win.id, win);
        });
        
    } catch (error) {
        console.error('Failed to update taskbar:', error);
    }
}

function updateTime() {
    const timeElement = document.getElementById('trayTimeHour');
    const dateElement = document.getElementById('trayDate');
    
    if (timeElement || dateElement) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const timeString = `${displayHours}:${minutes} ${ampm}`;
        
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        const dateString = `${month}/${day}/${year}`;
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    }
}

// Update taskbar periodically
setInterval(updateTaskbar, 1000);

// VPN Management
let vpnInfo = {
    ip: null,
    location: null,
    country: null,
    isp: null,
    connected: false,
    isFakeLocation: false
};

// Available VPN locations with fake IPs
const VPN_LOCATIONS = [
    { country: 'United States', city: 'New York', region: 'NY', ip: '104.248.90.212', isp: 'DigitalOcean LLC', flag: '🇺🇸' },
    { country: 'United Kingdom', city: 'London', region: 'England', ip: '159.65.118.43', isp: 'DigitalOcean LLC', flag: '🇬🇧' },
    { country: 'Germany', city: 'Frankfurt', region: 'Hesse', ip: '165.227.83.148', isp: 'DigitalOcean LLC', flag: '🇩🇪' },
    { country: 'Japan', city: 'Tokyo', region: 'Tokyo', ip: '167.99.54.12', isp: 'DigitalOcean LLC', flag: '🇯🇵' },
    { country: 'Canada', city: 'Toronto', region: 'Ontario', ip: '159.89.49.196', isp: 'DigitalOcean LLC', flag: '🇨🇦' },
    { country: 'France', city: 'Paris', region: 'Île-de-France', ip: '167.172.179.40', isp: 'DigitalOcean LLC', flag: '🇫🇷' },
    { country: 'Netherlands', city: 'Amsterdam', region: 'North Holland', ip: '178.128.61.240', isp: 'DigitalOcean LLC', flag: '🇳🇱' },
    { country: 'Singapore', city: 'Singapore', region: 'Singapore', ip: '134.209.196.42', isp: 'DigitalOcean LLC', flag: '🇸🇬' },
    { country: 'Australia', city: 'Sydney', region: 'NSW', ip: '167.99.13.162', isp: 'DigitalOcean LLC', flag: '🇦🇺' },
    { country: 'Switzerland', city: 'Zurich', region: 'Zurich', ip: '178.128.93.164', isp: 'DigitalOcean LLC', flag: '🇨🇭' },
    { country: 'Sweden', city: 'Stockholm', region: 'Stockholm', ip: '159.89.196.99', isp: 'DigitalOcean LLC', flag: '🇸🇪' },
    { country: 'Brazil', city: 'São Paulo', region: 'São Paulo', ip: '134.122.89.105', isp: 'DigitalOcean LLC', flag: '🇧🇷' },
    { country: 'South Korea', city: 'Seoul', region: 'Seoul', ip: '165.22.216.232', isp: 'DigitalOcean LLC', flag: '🇰🇷' },
    { country: 'India', city: 'Mumbai', region: 'Maharashtra', ip: '157.245.144.133', isp: 'DigitalOcean LLC', flag: '🇮🇳' },
    { country: 'Spain', city: 'Madrid', region: 'Madrid', ip: '167.99.172.135', isp: 'DigitalOcean LLC', flag: '🇪🇸' },
    { country: 'Italy', city: 'Milan', region: 'Lombardy', ip: '178.128.19.56', isp: 'DigitalOcean LLC', flag: '🇮🇹' },
    { country: 'Poland', city: 'Warsaw', region: 'Mazovia', ip: '159.89.220.107', isp: 'DigitalOcean LLC', flag: '🇵🇱' },
    { country: 'Norway', city: 'Oslo', region: 'Oslo', ip: '159.89.172.99', isp: 'DigitalOcean LLC', flag: '🇳🇴' },
    { country: 'Denmark', city: 'Copenhagen', region: 'Capital Region', ip: '157.245.27.89', isp: 'DigitalOcean LLC', flag: '🇩🇰' },
    { country: 'Finland', city: 'Helsinki', region: 'Uusimaa', ip: '167.99.5.145', isp: 'DigitalOcean LLC', flag: '🇫🇮' }
];

// Retry configuration for VPN info fetching
let vpnRetryCount = 0;
const MAX_VPN_RETRIES = 3;
const VPN_TIMEOUT = 10000; // 10 seconds

// Helper function to create a timeout promise
function createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
    });
}

// Fetch VPN info with retry logic and fallback APIs
async function fetchVpnInfo(retryAttempt = 0) {
    try {
        // Show connecting state on first attempt
        if (retryAttempt === 0) {
            vpnInfo.connected = false;
            updateVpnDisplay();
            updateVpnIndicator();
        }
        
        // Check if a fake location is selected
        const selectedLocation = localStorage.getItem('selectedVpnLocation');
        if (selectedLocation) {
            try {
                const location = JSON.parse(selectedLocation);
                vpnInfo = {
                    ip: location.ip,
                    location: `${location.city}, ${location.region}`,
                    country: location.country,
                    isp: location.isp,
                    connected: true,
                    isFakeLocation: true
                };
                
                updateVpnDisplay();
                updateVpnIndicator();
                
                // Store in localStorage
                try {
                    localStorage.setItem('vpnInfo', JSON.stringify(vpnInfo));
                } catch (e) {
                    // Ignore localStorage errors
                }
                return;
            } catch (e) {
                // If parsing fails, fall through to real location fetch
            }
        }
        
        // No fake location selected - fetch real location
        // List of fallback APIs in case one fails
        const apis = [
            'https://ipapi.co/json/',
            'https://api.ipify.org?format=json',
            'https://ip-api.com/json/'
        ];
        
        let response, data;
        let apiIndex = 0;
        let lastError = null;
        
        // Try each API until one works
        while (apiIndex < apis.length) {
            try {
                const apiUrl = apis[apiIndex];
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), VPN_TIMEOUT);
                
                response = await fetch(apiUrl, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                data = await response.json();
                
                // Handle different API response formats
                if (apiUrl.includes('ipify')) {
                    // ipify returns {ip: "..."}
                    data = {
                        ip: data.ip,
                        city: null,
                        region: null,
                        country_name: 'Unknown',
                        org: 'Unknown'
                    };
                } else if (apiUrl.includes('ip-api')) {
                    // ip-api returns different format
                    data = {
                        ip: data.query || data.ip,
                        city: data.city,
                        region: data.regionName,
                        country_name: data.country,
                        org: data.org || data.isp
                    };
                }
                
                // Success - break out of retry loop
                break;
            } catch (error) {
                lastError = error;
                apiIndex++;
                if (apiIndex < apis.length) {
                    // Try next API
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                throw error;
            }
        }
        
        // Update VPN info with successful data
        vpnInfo = {
            ip: data.ip || 'Unknown',
            location: data.city ? `${data.city}, ${data.region || ''}`.trim() : 'Unknown',
            country: data.country_name || 'Unknown',
            isp: data.org || 'Unknown',
            connected: true,
            isFakeLocation: false
        };
        
        // Reset retry count on success
        vpnRetryCount = 0;
        
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Store in localStorage to show it's isolated
        try {
            localStorage.setItem('vpnInfo', JSON.stringify(vpnInfo));
        } catch (e) {
            // Ignore localStorage errors
        }
    } catch (error) {
        // Retry logic
        if (retryAttempt < MAX_VPN_RETRIES) {
            vpnRetryCount++;
            // Exponential backoff: wait longer between retries
            const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
            setTimeout(() => {
                fetchVpnInfo(retryAttempt + 1);
            }, delay);
            return;
        }
        
        // All retries failed - use cached data if available
        const saved = localStorage.getItem('vpnInfo');
        if (saved) {
            try {
                const cached = JSON.parse(saved);
                vpnInfo = { ...cached, connected: false };
                updateVpnDisplay();
                updateVpnIndicator();
                return;
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // No cached data - show disconnected state
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Log error (suppressed in production to reduce console noise)
        // Only log final failure, not intermediate retries
        if (retryAttempt === MAX_VPN_RETRIES) {
            console.warn('VPN info fetch failed after retries:', error.message);
        }
    }
}

function updateVpnDisplay() {
    document.getElementById('vpnIpAddress').textContent = vpnInfo.ip || 'Loading...';
    document.getElementById('vpnLocation').textContent = vpnInfo.location || 'Loading...';
    document.getElementById('vpnCountry').textContent = vpnInfo.country || 'Loading...';
    document.getElementById('vpnIsp').textContent = vpnInfo.isp || 'Loading...';
    
    const statusText = document.getElementById('vpnStatusText');
    const statusDot = document.getElementById('vpnStatusDot');
    const fakeIndicator = document.getElementById('vpnFakeIndicator');
    
    if (vpnInfo.connected) {
        statusText.textContent = 'Connected';
        statusDot.className = 'vpn-status-dot connected';
    } else {
        statusText.textContent = 'Disconnected';
        statusDot.className = 'vpn-status-dot disconnected';
    }
    
    // Show fake location indicator if using spoofed location
    if (fakeIndicator) {
        if (vpnInfo.isFakeLocation && vpnInfo.connected) {
            fakeIndicator.style.display = 'flex';
        } else {
            fakeIndicator.style.display = 'none';
        }
    }
}

function updateVpnIndicator() {
    const indicator = document.getElementById('vpnIndicator');
    if (vpnInfo.connected) {
        indicator.classList.add('active');
        indicator.classList.remove('connecting');
    } else {
        indicator.classList.remove('active');
        indicator.classList.add('connecting');
    }
    
    // Update top badge as well
    const badgeDot = document.getElementById('vpnStatusBadgeDot');
    const badgeLocation = document.getElementById('vpnStatusBadgeLocation');
    const badge = document.getElementById('vpnStatusBadge');
    
    if (badgeDot && badgeLocation && badge) {
        if (vpnInfo.connected) {
            badgeDot.className = 'vpn-status-badge-dot connected';
            if (vpnInfo.country && vpnInfo.location) {
                badgeLocation.textContent = `${vpnInfo.country} • ${vpnInfo.ip || ''}`;
            } else {
                badgeLocation.textContent = 'Connected';
            }
        } else {
            badgeDot.className = 'vpn-status-badge-dot disconnected';
            // Check if location has been selected
            const hasSelectedLocation = localStorage.getItem('selectedVpnLocation');
            const hasChosenRealLocation = localStorage.getItem('vpnUseRealLocation');
            if (!hasSelectedLocation && !hasChosenRealLocation) {
                badgeLocation.textContent = 'Select Location';
            } else {
                badgeLocation.textContent = 'Disconnected';
            }
        }
    }
}

function setupVpnPanel() {
    const vpnIndicator = document.getElementById('vpnIndicator');
    const vpnPanel = document.getElementById('vpnPanel');
    const closeBtn = document.getElementById('closeVpnPanel');
    const refreshBtn = document.getElementById('refreshVpnBtn');
    const vpnInfoBtn = document.getElementById('vpnInfoBtn');
    const vpnStatusBadge = document.getElementById('vpnStatusBadge');
    
    vpnIndicator.addEventListener('click', () => {
        vpnPanel.classList.toggle('active');
    });
    
    // Make the top badge clickable to open VPN panel
    if (vpnStatusBadge) {
        vpnStatusBadge.addEventListener('click', () => {
            vpnPanel.classList.toggle('active');
        });
    }
    
    closeBtn.addEventListener('click', () => {
        vpnPanel.classList.remove('active');
    });
    
    refreshBtn.addEventListener('click', () => {
        vpnRetryCount = 0; // Reset retry count on manual refresh
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
        fetchVpnInfo(0);
    });
    
    // Change location button
    if (vpnInfoBtn) {
        vpnInfoBtn.textContent = 'Change Location';
        vpnInfoBtn.addEventListener('click', () => {
            showVpnLocationModal();
        });
    }
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.vpn-panel') && !e.target.closest('.vpn-indicator') && !e.target.closest('.vpn-status-badge')) {
            vpnPanel.classList.remove('active');
        }
    });
}

// Start Menu Search Functionality
function setupStartMenuSearch() {
    const searchInput = document.getElementById('startSearch');
    const appsContainer = document.querySelector('.start-menu-apps');
    const filesContainer = document.getElementById('startMenuFiles');
    let allFiles = [];
    let searchTimeout = null;
    
    // Load files on start menu open
    const startMenu = document.getElementById('startMenu');
    const observer = new MutationObserver(() => {
        if (startMenu.classList.contains('active')) {
            loadFilesForSearch();
        }
    });
    observer.observe(startMenu, { attributes: true, attributeFilter: ['class'] });
    
    // Initial load
    loadFilesForSearch();
    
    async function loadFilesForSearch() {
        if (window.electronAPI && window.electronAPI.listDocuments) {
            try {
                allFiles = await window.electronAPI.listDocuments();
            } catch (error) {
                console.error('Failed to load files for search:', error);
                allFiles = [];
            }
        }
    }
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 150);
    });
    
    function performSearch(searchTerm) {
        if (!searchTerm) {
            // Show all apps, hide files
            appsContainer.style.display = 'flex';
            filesContainer.style.display = 'none';
            document.querySelectorAll('.start-menu-item').forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }
        
        // Filter apps
        let hasAppMatches = false;
        document.querySelectorAll('.start-menu-item').forEach(item => {
            const title = item.querySelector('.start-menu-title')?.textContent.toLowerCase() || '';
            const subtitle = item.querySelector('.start-menu-subtitle')?.textContent.toLowerCase() || '';
            const matches = title.includes(searchTerm) || subtitle.includes(searchTerm);
            
            if (matches) {
                item.style.display = 'flex';
                hasAppMatches = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Filter files
        const fileMatches = allFiles.filter(file => {
            if (file.isDirectory) return false;
            return file.name.toLowerCase().includes(searchTerm);
        });
        
        // Show/hide containers
        if (hasAppMatches || fileMatches.length > 0) {
            appsContainer.style.display = hasAppMatches ? 'flex' : 'none';
            filesContainer.style.display = fileMatches.length > 0 ? 'block' : 'none';
        } else {
            appsContainer.style.display = 'flex';
            filesContainer.style.display = 'none';
        }
        
        // Render file results
        if (fileMatches.length > 0) {
            renderFileResults(fileMatches, searchTerm);
        } else {
            filesContainer.innerHTML = '';
        }
    }
    
    function renderFileResults(files, searchTerm) {
        filesContainer.innerHTML = '';
        
        // Add header
        const header = document.createElement('div');
        header.style.padding = '8px 16px';
        header.style.fontSize = '12px';
        header.style.fontWeight = '600';
        header.style.color = '#666';
        header.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
        header.style.marginTop = '8px';
        header.textContent = 'Files';
        filesContainer.appendChild(header);
        
        files.slice(0, 5).forEach(file => { // Limit to 5 results
            const item = document.createElement('div');
            item.className = 'start-menu-item';
            item.style.cursor = 'pointer';
            
            // Get file icon
            const ext = file.extension;
            let icon = '📄';
            if (['.doc', '.docx'].includes(ext)) icon = '📄';
            else if (['.xls', '.xlsx', '.csv', '.json'].includes(ext)) icon = '📊';
            else if (['.txt', '.rtf'].includes(ext)) icon = '📝';
            else if (['.html', '.htm'].includes(ext)) icon = '🌐';
            
            item.innerHTML = `
                <div class="start-menu-icon">${icon}</div>
                <div class="start-menu-text">
                    <div class="start-menu-title">${file.name}</div>
                    <div class="start-menu-subtitle">Document</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.openFileInApp) {
                    window.electronAPI.openFileInApp(file.path).then(result => {
                        if (!result.success) {
                            alert('Failed to open file: ' + result.error);
                        } else {
                            closeStartMenu();
                        }
                    });
                }
            });
            
            filesContainer.appendChild(item);
        });
    }
}

// VPN Location Selection Modal
function showVpnLocationModal() {
    const modal = document.getElementById('vpnLocationModal');
    const list = document.getElementById('vpnLocationList');
    const searchInput = document.getElementById('vpnLocationSearch');
    const skipBtn = document.getElementById('skipVpnLocation');
    const useRealBtn = document.getElementById('useRealLocation');
    
    // Clear and populate location list
    list.innerHTML = '';
    
    // Get currently selected location
    const currentLocation = localStorage.getItem('selectedVpnLocation');
    let currentLocationData = null;
    if (currentLocation) {
        try {
            currentLocationData = JSON.parse(currentLocation);
        } catch (e) {}
    }
    
    VPN_LOCATIONS.forEach(location => {
        const item = document.createElement('div');
        item.className = 'vpn-location-item';
        if (currentLocationData && currentLocationData.country === location.country) {
            item.classList.add('selected');
        }
        
        item.innerHTML = `
            <span class="vpn-location-item-flag">${location.flag}</span>
            <div class="vpn-location-item-info">
                <div class="vpn-location-item-name">${location.country}</div>
                <div class="vpn-location-item-details">${location.city}, ${location.region} • ${location.ip}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            // Remove selected class from all items
            document.querySelectorAll('.vpn-location-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            // Store selected location and clear real location preference
            localStorage.setItem('selectedVpnLocation', JSON.stringify(location));
            localStorage.removeItem('vpnUseRealLocation');
            
            // Update VPN info immediately
            vpnInfo = {
                ip: location.ip,
                location: `${location.city}, ${location.region}`,
                country: location.country,
                isp: location.isp,
                connected: true,
                isFakeLocation: true
            };
            
            updateVpnDisplay();
            updateVpnIndicator();
            localStorage.setItem('vpnInfo', JSON.stringify(vpnInfo));
            
            // Close modal after a brief delay
            setTimeout(() => {
                modal.classList.remove('active');
            }, 300);
        });
        
        list.appendChild(item);
    });
    
    // Search functionality
    searchInput.value = '';
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        Array.from(list.children).forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    });
    
    // Skip button - use real location
    skipBtn.addEventListener('click', () => {
        localStorage.removeItem('selectedVpnLocation');
        localStorage.setItem('vpnUseRealLocation', 'true');
        modal.classList.remove('active');
        fetchVpnInfo(0);
    });
    
    // Use real location button
    useRealBtn.addEventListener('click', () => {
        localStorage.removeItem('selectedVpnLocation');
        localStorage.setItem('vpnUseRealLocation', 'true');
        modal.classList.remove('active');
        fetchVpnInfo(0);
    });
    
    modal.classList.add('active');
}

// Initialize VPN on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeVpn();
    });
} else {
    initializeVpn();
}

function initializeVpn() {
    setupVpnPanel();
    
    // Check if user has explicitly selected a location or chosen to use real location
    const hasSelectedLocation = localStorage.getItem('selectedVpnLocation');
    const hasChosenRealLocation = localStorage.getItem('vpnUseRealLocation');
    const hasVpnInfo = localStorage.getItem('vpnInfo');
    
    // If no location selected and user hasn't chosen real location, show location selection modal
    if (!hasSelectedLocation && !hasChosenRealLocation) {
        // Set initial state to show "Select Location"
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Show modal after a brief delay to let the UI render
        setTimeout(() => {
            showVpnLocationModal();
        }, 500);
        return;
    }
    
    // Try to load saved VPN info
    const saved = localStorage.getItem('vpnInfo');
    if (saved) {
        try {
            vpnInfo = JSON.parse(saved);
            updateVpnDisplay();
            updateVpnIndicator();
        } catch (e) {
            console.error('Failed to load saved VPN info:', e);
        }
    }
    
    // Start with connecting state if no saved info
    if (!vpnInfo.ip) {
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
    }
    
    // Only fetch VPN info if user chose real location, otherwise use fake location
    if (hasChosenRealLocation && !hasSelectedLocation) {
        fetchVpnInfo();
        // Refresh every 5 minutes
        setInterval(fetchVpnInfo, 5 * 60 * 1000);
    } else if (hasSelectedLocation) {
        // Use fake location - already set in fetchVpnInfo logic
        fetchVpnInfo();
    }
}

