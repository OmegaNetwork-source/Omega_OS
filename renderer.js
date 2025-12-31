// Theme Management
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// Window Controls - App Window
let currentWindowId = null;

// Get window ID when available
if (window.electronAPI) {
    // Try to get window ID immediately
    window.electronAPI.getWindowId?.().then(id => {
        if (id) currentWindowId = id;
    });
    
    // Listen for window ID assignment
    window.electronAPI.onWindowId?.((windowId) => {
        currentWindowId = windowId;
    });
}

document.getElementById('minimizeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowMinimize(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowMinimize(null);
    }
});

document.getElementById('maximizeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowMaximize(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowMaximize(null);
    }
});

document.getElementById('closeBtn')?.addEventListener('click', () => {
    if (window.electronAPI && currentWindowId) {
        window.electronAPI.appWindowClose(currentWindowId);
    } else if (window.electronAPI) {
        // Fallback: try without ID (main process will auto-detect)
        window.electronAPI.appWindowClose(null);
    }
});

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggle');

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
    });
}

// Sidebar Toggle
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
if (sidebarCollapsed === null) {
    sidebarCollapsed = true; // Default to collapsed
} else {
    sidebarCollapsed = sidebarCollapsed === 'true';
}

const sidebar = document.getElementById('sidebar');
const aiButton = document.getElementById('aiButton');

function updateSidebarState(collapsed) {
    sidebarCollapsed = collapsed;
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        aiButton.classList.remove('active');
    } else {
        sidebar.classList.remove('collapsed');
        aiButton.classList.add('active');
    }
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
}

if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
} else {
    aiButton.classList.add('active');
}

// AI Button - Toggle Sidebar
aiButton.addEventListener('click', () => {
    updateSidebarState(!sidebarCollapsed);
});

// Sidebar Toggle Button
document.getElementById('sidebarToggle').addEventListener('click', () => {
    updateSidebarState(!sidebarCollapsed);
});

// Tab Management
let tabs = [];
let activeTabId = 0;
let tabIdCounter = 0;

function createTab(url = null) {
    if (!url) {
        url = getHomeUrl();
    }
    const tabId = tabIdCounter++;
    tabs.push({
        id: tabId,
        url: url,
        title: 'New Tab'
    });
    
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
        <span class="tab-title">New Tab</span>
        <button class="tab-close">&times;</button>
    `;
    
    if (tabsContainer) {
        tabsContainer.appendChild(tab);
    }
    
    // Tab click handler
    tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close') && !e.target.closest('.tab-close')) {
            switchTab(tabId);
        }
    });
    
    // Tab close handler
    const closeBtn = tab.querySelector('.tab-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tabId);
        });
    }
    
    // Create webview for this tab before switching
    createWebView(tabId, url);
    
    // Switch to the new tab
    switchTab(tabId);
}

function switchTab(tabId) {
    activeTabId = tabId;
    
    // Update tab appearance
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        if (parseInt(t.dataset.tabId) === tabId) {
            t.classList.add('active');
        }
    });
    
    // Show/hide webviews
    document.querySelectorAll('webview').forEach(wv => {
        if (parseInt(wv.dataset.tabId) === tabId) {
            wv.style.display = 'inline-flex';
        } else {
            wv.style.display = 'none';
        }
    });
    
    // Update address bar and navigation
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        const addressBar = document.getElementById('addressBar');
        addressBar.value = tab.url;
        updateTabTitle(tabId, tab.title);
    }
}

function closeTab(tabId) {
    if (tabs.length <= 1) {
        // Don't close the last tab
        return;
    }
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    tabs.splice(tabIndex, 1);
    
    // Remove tab element
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.remove();
    }
    
    // Remove webview
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (webview) {
        webview.remove();
    }
    
    // Switch to another tab
    if (activeTabId === tabId) {
        const newActiveTab = tabs.length > 0 ? tabs[Math.max(0, tabIndex - 1)].id : null;
        if (newActiveTab !== null) {
            switchTab(newActiveTab);
        }
    }
}

function updateTabTitle(tabId, title) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.title = title;
    }
    
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
    if (tabElement) {
        tabElement.textContent = title || 'New Tab';
    }
}

function createWebView(tabId, url) {
    const container = document.querySelector('.webview-container');
    const webview = document.createElement('webview');
    webview.dataset.tabId = tabId;
    webview.src = url;
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.display = tabId === activeTabId ? 'inline-flex' : 'none';
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'allowRunningInsecureContent');
    
    // Hide all other webviews when this one is shown
    webview.addEventListener('dom-ready', () => {
        if (parseInt(webview.dataset.tabId) === activeTabId) {
            document.querySelectorAll('webview').forEach(wv => {
                if (wv !== webview) {
                    wv.style.display = 'none';
                }
            });
        }
    });
    
    webview.addEventListener('page-title-updated', (e) => {
        updateTabTitle(tabId, e.title);
        // Add to history when page loads
        const tab = tabs.find(t => t.id === tabId);
        if (tab && e.title) {
            addToHistory(tab.url, e.title);
        }
    });
    
    webview.addEventListener('did-start-loading', () => {
        updateNavButtons();
    });
    
    webview.addEventListener('did-stop-loading', () => {
        updateNavButtons();
    });
    
    webview.addEventListener('did-navigate', (e) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            tab.url = e.url;
            if (parseInt(webview.dataset.tabId) === activeTabId) {
                const addressBar = document.getElementById('addressBar');
                if (addressBar) {
                    addressBar.value = e.url;
                }
            }
            // Add to history
            if (e.url && !e.url.startsWith('chrome-extension://') && !e.url.startsWith('about:')) {
                addToHistory(e.url, tab.title);
            }
        }
        updateNavButtons();
        applyZoom();
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab && e.isMainFrame) {
            tab.url = e.url;
            if (parseInt(webview.dataset.tabId) === activeTabId) {
                const addressBar = document.getElementById('addressBar');
                if (addressBar) {
                    addressBar.value = e.url;
                }
            }
        }
    });
    
    webview.addEventListener('did-fail-load', (e) => {
        console.error('Failed to load:', e.errorDescription);
        // Could show an error page here
    });
    
    webview.addEventListener('did-start-navigation', (e) => {
        if (e.isDownload) {
            addDownload(e.url, e.url.split('/').pop() || 'download');
        }
    });
    
    webview.addEventListener('will-download', (e) => {
        const filename = e.suggestedFilename || e.url.split('/').pop() || 'download';
        addDownload(e.url, filename);
    });
    
    container.appendChild(webview);
    applyZoom();
    injectSolanaProvider(webview);
}

// Navigation
document.getElementById('backBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.goBack();
    }
});

document.getElementById('forwardBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.goForward();
    }
});

document.getElementById('reloadBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.reload();
    }
});

document.getElementById('homeBtn').addEventListener('click', () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.src = getHomeUrl();
    }
});

// Address Bar
const addressBar = document.getElementById('addressBar');
addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        navigateToAddress(addressBar.value.trim());
    }
});

function navigateToAddress(input) {
    let url = input;
    
        if (!url) {
            url = getHomeUrl();
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Check if it looks like a URL or a search query
        // A URL should have a dot and no spaces, or be a localhost/local path
        if ((url.includes('.') || url.startsWith('localhost') || url.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)) && !url.includes(' ')) {
            url = 'https://' + url;
            } else {
                // Search query - use selected search engine
                url = getSearchUrl(url);
            }
    }
    
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
        tab.url = url;
    }
    
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.src = url;
    } else {
        // Webview doesn't exist yet, create it
        createWebView(activeTabId, url);
    }
}

// Update navigation button states
function updateNavButtons() {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (webview) {
        webview.canGoBack().then(canGoBack => {
            document.getElementById('backBtn').disabled = !canGoBack;
        });
        webview.canGoForward().then(canGoForward => {
            document.getElementById('forwardBtn').disabled = !canGoForward;
        });
    }
}

// Search Engine Management (defined before use)
const searchEngines = {
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com', search: 'https://duckduckgo.com/?q=' },
    startpage: { name: 'Startpage', url: 'https://www.startpage.com', search: 'https://www.startpage.com/sp/search?query=' },
    searx: { name: 'SearX', url: 'https://searx.org', search: 'https://searx.org/search?q=' }
};

let currentSearchEngine = localStorage.getItem('searchEngine') || 'duckduckgo';

function getSearchUrl(query) {
    return searchEngines[currentSearchEngine].search + encodeURIComponent(query);
}

function getHomeUrl() {
    return searchEngines[currentSearchEngine].url;
}

// History Management
let history = JSON.parse(localStorage.getItem('browserHistory') || '[]');

function addToHistory(url, title) {
    const historyItem = {
        id: Date.now(),
        url: url,
        title: title || url,
        timestamp: Date.now()
    };
    history.unshift(historyItem);
    // Keep only last 1000 items
    if (history.length > 1000) {
        history = history.slice(0, 1000);
    }
    localStorage.setItem('browserHistory', JSON.stringify(history));
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No history yet</div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();
        return `
            <div class="history-item" data-url="${item.url}">
                <div class="history-item-content">
                    <div class="history-item-title">${item.title}</div>
                    <div class="history-item-url">${item.url}</div>
                </div>
                <div class="history-item-time">${timeStr}</div>
                <button class="item-delete" data-id="${item.id}" title="Delete">×</button>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('item-delete')) {
                const url = item.dataset.url;
                navigateToAddress(url);
                closePanel('historyPanel');
            }
        });
    });
    
    // Add delete handlers
    historyList.querySelectorAll('.item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            history = history.filter(item => item.id !== id);
            localStorage.setItem('browserHistory', JSON.stringify(history));
            renderHistory();
        });
    });
}

// Bookmarks Management
let bookmarks = JSON.parse(localStorage.getItem('browserBookmarks') || '[]');

function addBookmark(url, title) {
    const bookmark = {
        id: Date.now(),
        url: url,
        title: title || url,
        timestamp: Date.now()
    };
    bookmarks.push(bookmark);
    localStorage.setItem('browserBookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
}

function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarksList');
    if (!bookmarksList) return;
    
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No bookmarks yet</div>';
        return;
    }
    
    bookmarksList.innerHTML = bookmarks.map(item => {
        return `
            <div class="bookmark-item" data-url="${item.url}">
                <div class="bookmark-item-content">
                    <div class="bookmark-item-title">${item.title}</div>
                    <div class="bookmark-item-url">${item.url}</div>
                </div>
                <button class="item-delete" data-id="${item.id}" title="Delete">×</button>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    bookmarksList.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('item-delete')) {
                const url = item.dataset.url;
                navigateToAddress(url);
                closePanel('bookmarksPanel');
            }
        });
    });
    
    // Add delete handlers
    bookmarksList.querySelectorAll('.item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            bookmarks = bookmarks.filter(item => item.id !== id);
            localStorage.setItem('browserBookmarks', JSON.stringify(bookmarks));
            renderBookmarks();
        });
    });
}

// Downloads Management
let downloads = JSON.parse(localStorage.getItem('browserDownloads') || '[]');

function addDownload(url, filename) {
    const download = {
        id: Date.now(),
        url: url,
        filename: filename || url.split('/').pop() || 'download',
        timestamp: Date.now(),
        status: 'completed'
    };
    downloads.unshift(download);
    if (downloads.length > 100) {
        downloads = downloads.slice(0, 100);
    }
    localStorage.setItem('browserDownloads', JSON.stringify(downloads));
    renderDownloads();
}

function renderDownloads() {
    const downloadsList = document.getElementById('downloadsList');
    if (!downloadsList) return;
    
    if (downloads.length === 0) {
        downloadsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No downloads yet</div>';
        return;
    }
    
    downloadsList.innerHTML = downloads.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString();
        return `
            <div class="download-item">
                <div class="history-item-content">
                    <div class="history-item-title">${item.filename}</div>
                    <div class="history-item-url">${item.url}</div>
                    <div class="history-item-time" style="margin-top: 4px;">${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Zoom Management
let currentZoom = parseFloat(localStorage.getItem('browserZoom') || '1.0');

function updateZoom(zoom) {
    currentZoom = Math.max(0.25, Math.min(5.0, zoom));
    localStorage.setItem('browserZoom', currentZoom.toString());
    updateZoomDisplay();
    applyZoom();
}

function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
    }
}

function applyZoom() {
    document.querySelectorAll('webview').forEach(webview => {
        webview.setZoomFactor(currentZoom);
    });
}

// Panel Management
function openPanel(panelId) {
    closeAllPanels();
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('active');
        if (panelId === 'historyPanel') {
            renderHistory();
        } else if (panelId === 'bookmarksPanel') {
            renderBookmarks();
        } else if (panelId === 'downloadsPanel') {
            renderDownloads();
        } else if (panelId === 'settingsPanel') {
            openSettings();
        }
    }
}

function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove('active');
    }
}

function closeAllPanels() {
    closePanel('historyPanel');
    closePanel('bookmarksPanel');
    closePanel('downloadsPanel');
    closePanel('settingsPanel');
    closeDropdown();
}

// Settings Dropdown
const settingsDropdown = document.getElementById('settingsDropdown');
let dropdownOpen = false;

function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
    if (dropdownOpen) {
        settingsDropdown.classList.add('active');
    } else {
        closeDropdown();
    }
}

function closeDropdown() {
    dropdownOpen = false;
    if (settingsDropdown) {
        settingsDropdown.classList.remove('active');
    }
}

// Settings Panel
const settingsPanel = document.getElementById('settingsPanel');
let settingsOpen = false;

function openSettings() {
    settingsOpen = true;
    settingsPanel.classList.add('active');
    // Load current settings
    const searchEngineRadios = document.querySelectorAll('input[name="searchEngine"]');
    searchEngineRadios.forEach(radio => {
        if (radio.value === currentSearchEngine) {
            radio.checked = true;
        }
    });
    
    const blockTrackers = document.getElementById('blockTrackers');
    const clearOnClose = document.getElementById('clearOnClose');
    if (blockTrackers) {
        blockTrackers.checked = localStorage.getItem('blockTrackers') !== 'false';
    }
    if (clearOnClose) {
        clearOnClose.checked = localStorage.getItem('clearOnClose') === 'true';
    }
}

function closeSettings() {
    settingsOpen = false;
    settingsPanel.classList.remove('active');
}

// Initialize all buttons after DOM is ready
function initializeButtons() {
    // New Tab Button
    const newTabBtn = document.getElementById('newTabBtn');
    if (newTabBtn) {
        newTabBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            createTab(getHomeUrl());
        });
    }

    // Settings Button - Toggle Dropdown
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsBtnContainer = settingsBtn?.parentElement;
    if (settingsBtn && settingsDropdown) {
        // Position dropdown relative to button
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownOpen && !settingsDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
                closeDropdown();
            }
        });
    }
    
    // Dropdown Menu Items
    document.getElementById('historyBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('historyPanel');
    });
    
    document.getElementById('bookmarksBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('bookmarksPanel');
    });
    
    document.getElementById('downloadsBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('downloadsPanel');
    });
    
    document.getElementById('settingsMenuBtn')?.addEventListener('click', () => {
        closeDropdown();
        openPanel('settingsPanel');
    });
    
    // Zoom Controls
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        updateZoom(currentZoom + 0.1);
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', () => {
        updateZoom(currentZoom - 0.1);
    });
    
    document.getElementById('zoomReset')?.addEventListener('click', () => {
        updateZoom(1.0);
    });
    
    // Panel Close Buttons
    document.getElementById('historyClose')?.addEventListener('click', () => closePanel('historyPanel'));
    document.getElementById('bookmarksClose')?.addEventListener('click', () => closePanel('bookmarksPanel'));
    document.getElementById('downloadsClose')?.addEventListener('click', () => closePanel('downloadsPanel'));
    document.getElementById('settingsClose')?.addEventListener('click', () => closePanel('settingsPanel'));
    
    // Clear History Button
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (confirm('Clear all browsing history?')) {
            history = [];
            localStorage.setItem('browserHistory', JSON.stringify(history));
            renderHistory();
        }
    });
    
    // Add Bookmark Button
    document.getElementById('addBookmarkBtn')?.addEventListener('click', () => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
        if (webview) {
            const url = webview.src;
            const tab = tabs.find(t => t.id === activeTabId);
            const title = tab?.title || url;
            addBookmark(url, title);
            alert('Bookmark added!');
        }
    });
    
    // Settings Search Engine Selection
    const searchEngineRadios = document.querySelectorAll('input[name="searchEngine"]');
    searchEngineRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSearchEngine = e.target.value;
            localStorage.setItem('searchEngine', currentSearchEngine);
        });
    });
    
    // Settings Checkboxes
    const blockTrackers = document.getElementById('blockTrackers');
    if (blockTrackers) {
        blockTrackers.addEventListener('change', (e) => {
            localStorage.setItem('blockTrackers', e.target.checked);
        });
    }
    
    const clearOnClose = document.getElementById('clearOnClose');
    if (clearOnClose) {
        clearOnClose.addEventListener('change', (e) => {
            localStorage.setItem('clearOnClose', e.target.checked);
        });
    }
    
    // Close panels when clicking outside
    ['historyPanel', 'bookmarksPanel', 'downloadsPanel', 'settingsPanel', 'walletPanel'].forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.addEventListener('click', (e) => {
                if (e.target === panel) {
                    closePanel(panelId);
                }
            });
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+H - History
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            openPanel('historyPanel');
        }
        // Ctrl+J - Downloads
        if (e.ctrlKey && e.key === 'j') {
            e.preventDefault();
            openPanel('downloadsPanel');
        }
        // Ctrl+Shift+O - Bookmarks
        if (e.ctrlKey && e.shiftKey && e.key === 'O') {
            e.preventDefault();
            openPanel('bookmarksPanel');
        }
    });
    
        // Initialize zoom display
    updateZoomDisplay();
    
    // Wallet Button
    document.getElementById('walletBtn')?.addEventListener('click', () => {
        openWalletPanel();
    });
    
    // Wallet Panel Close
    document.getElementById('walletClose')?.addEventListener('click', () => {
        closePanel('walletPanel');
    });
    
    // Wallet Setup Buttons
    document.getElementById('createWalletBtn')?.addEventListener('click', () => {
        document.getElementById('createWalletForm').style.display = 'block';
        document.getElementById('importWalletForm').style.display = 'none';
    });
    
    document.getElementById('importWalletBtn')?.addEventListener('click', () => {
        document.getElementById('importWalletForm').style.display = 'block';
        document.getElementById('createWalletForm').style.display = 'none';
    });
    
    // Create Wallet
    document.getElementById('createWalletSubmit')?.addEventListener('click', async () => {
        const password = document.getElementById('createPassword').value;
        const confirmPassword = document.getElementById('createPasswordConfirm').value;
        
        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        try {
            const result = await window.electronAPI.walletCreate(password);
            document.getElementById('walletPrivateKey').value = result.secretKey;
            document.getElementById('walletMnemonic').style.display = 'block';
            document.getElementById('createPassword').value = '';
            document.getElementById('createPasswordConfirm').value = '';
        } catch (error) {
            alert('Failed to create wallet: ' + error.message);
        }
    });
    
    document.getElementById('walletMnemonicConfirm')?.addEventListener('click', () => {
        document.getElementById('walletMnemonic').style.display = 'none';
        document.getElementById('createWalletForm').style.display = 'none';
        loadWalletDashboard();
    });
    
    // Import Wallet
    document.getElementById('importWalletSubmit')?.addEventListener('click', async () => {
        const privateKey = document.getElementById('importPrivateKey').value.trim();
        const password = document.getElementById('importPassword').value;
        
        if (!privateKey || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        try {
            await window.electronAPI.walletImportFromPrivateKey(privateKey, password);
            document.getElementById('importPrivateKey').value = '';
            document.getElementById('importPassword').value = '';
            document.getElementById('importWalletForm').style.display = 'none';
            loadWalletDashboard();
        } catch (error) {
            alert('Failed to import wallet: ' + error.message);
        }
    });
    
    // Login Wallet
    document.getElementById('loginWalletBtn')?.addEventListener('click', async () => {
        const password = document.getElementById('loginPassword').value;
        
        if (!password) {
            alert('Please enter password');
            return;
        }
        
        try {
            await window.electronAPI.walletLoad(password);
            document.getElementById('loginPassword').value = '';
            loadWalletDashboard();
        } catch (error) {
            alert('Failed to unlock wallet: ' + error.message);
        }
    });
    
    // Wallet Dashboard
    document.getElementById('refreshBalanceBtn')?.addEventListener('click', async () => {
        await refreshWalletBalance();
    });
    
    document.getElementById('copyAddressBtn')?.addEventListener('click', async () => {
        const publicKey = await window.electronAPI.walletGetPublicKey();
        if (publicKey) {
            navigator.clipboard.writeText(publicKey);
            alert('Address copied to clipboard!');
        }
    });
    
    document.getElementById('sendSolBtn')?.addEventListener('click', async () => {
        const toAddress = document.getElementById('sendToAddress').value.trim();
        const amount = parseFloat(document.getElementById('sendAmount').value);
        
        if (!toAddress) {
            alert('Please enter recipient address');
            return;
        }
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (confirm(`Send ${amount} SOL to ${toAddress.substring(0, 8)}...${toAddress.substring(toAddress.length - 8)}?`)) {
            try {
                const signature = await window.electronAPI.walletSendSol(toAddress, amount);
                alert(`Transaction sent! Signature: ${signature}`);
                document.getElementById('sendToAddress').value = '';
                document.getElementById('sendAmount').value = '';
                await refreshWalletBalance();
            } catch (error) {
                alert('Failed to send SOL: ' + error.message);
            }
        }
    });
    
    // Initialize wallet panel state
    checkWalletState();
}

// Wallet Functions
async function checkWalletState() {
    const hasWallet = await window.electronAPI.walletHasWallet();
    const isLoaded = await window.electronAPI.walletIsLoaded();
    
    if (!hasWallet) {
        showWalletSetup();
    } else if (!isLoaded) {
        showWalletLogin();
    } else {
        loadWalletDashboard();
    }
}

function showWalletSetup() {
    document.getElementById('walletSetup').style.display = 'block';
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'none';
}

function showWalletLogin() {
    document.getElementById('walletSetup').style.display = 'none';
    document.getElementById('walletLogin').style.display = 'block';
    document.getElementById('walletDashboard').style.display = 'none';
}

async function loadWalletDashboard() {
    document.getElementById('walletSetup').style.display = 'none';
    document.getElementById('walletLogin').style.display = 'none';
    document.getElementById('walletDashboard').style.display = 'block';
    
    const publicKey = await window.electronAPI.walletGetPublicKey();
    if (publicKey) {
        document.getElementById('walletAddress').textContent = publicKey;
    }
    
    await refreshWalletBalance();
}

async function refreshWalletBalance() {
    try {
        const balance = await window.electronAPI.walletGetBalance();
        document.getElementById('walletBalance').textContent = balance.toFixed(4) + ' SOL';
    } catch (error) {
        document.getElementById('walletBalance').textContent = 'Error loading balance';
    }
}

function openWalletPanel() {
    closeAllPanels();
    checkWalletState();
    openPanel('walletPanel');
}

// Position dropdown relative to settings button (already positioned via CSS, no need to adjust)

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeButtons();
        // Initialize first tab
        createTab(getHomeUrl());
    });
} else {
    // DOM is already ready
    initializeButtons();
    createTab(getHomeUrl());
}

// Periodically update nav buttons
setInterval(updateNavButtons, 500);

// Solana Provider Injection
const solanaProviderScript = `
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
            const requestId = Date.now() + Math.random();
            return new Promise((resolve, reject) => {
                window.postMessage({ 
                    type: 'OMEGA_WALLET_REQUEST',
                    action: 'connect',
                    id: requestId
                }, '*');
                
                const handler = (event) => {
                    if (event.data && event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'connect' && event.data.id === requestId) {
                        window.removeEventListener('message', handler);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            const pubKey = { toString: () => event.data.publicKey, toBase58: () => event.data.publicKey };
                            this.publicKey = pubKey;
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
            
            const requestId = Date.now() + Math.random();
            return new Promise((resolve, reject) => {
                const serialized = transaction.serialize({ requireAllSignatures: false });
                const base64 = btoa(String.fromCharCode(...serialized));
                
                window.postMessage({ 
                    type: 'OMEGA_WALLET_REQUEST',
                    action: 'signTransaction',
                    data: base64,
                    id: requestId
                }, '*');
                
                const handler = (event) => {
                    if (event.data && event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'signTransaction' && event.data.id === requestId) {
                        window.removeEventListener('message', handler);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            try {
                                const signed = Uint8Array.from(atob(event.data.data), c => c.charCodeAt(0));
                                const Transaction = window.solanaWeb3?.Transaction;
                                if (Transaction) {
                                    resolve(Transaction.from(signed));
                                } else {
                                    resolve({ serialize: () => signed });
                                }
                            } catch (e) {
                                reject(e);
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
            
            const requestId = Date.now() + Math.random();
            return new Promise((resolve, reject) => {
                const messageStr = typeof message === 'string' ? message : new TextDecoder(encoding).decode(message);
                
                window.postMessage({ 
                    type: 'OMEGA_WALLET_REQUEST',
                    action: 'signMessage',
                    data: messageStr,
                    id: requestId
                }, '*');
                
                const handler = (event) => {
                    if (event.data && event.data.type === 'OMEGA_WALLET_RESPONSE' && event.data.action === 'signMessage' && event.data.id === requestId) {
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

function injectSolanaProvider(webview) {
    webview.executeJavaScript(solanaProviderScript);
    
    // Listen for wallet requests from webview
    webview.addEventListener('ipc-message', async (event) => {
        if (event.channel === 'wallet-request') {
            await handleWalletRequest(webview, event.args[0]);
        }
    });
    
    // Also handle postMessage via content script injection
    webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(`
            (function() {
                const originalPostMessage = window.postMessage;
                window.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'OMEGA_WALLET_REQUEST') {
                        window.parent.postMessage(event.data, '*');
                    }
                });
            })();
        `);
    });
}

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
        const responseData = { type: 'OMEGA_WALLET_RESPONSE', ...response, id: request.id, action: request.action };
        webview.executeJavaScript(`
            window.postMessage(${JSON.stringify(responseData)}, '*');
        `);
    } catch (error) {
        const errorResponse = { type: 'OMEGA_WALLET_RESPONSE', error: error.message, id: request.id, action: request.action };
        webview.executeJavaScript(`
            window.postMessage(${JSON.stringify(errorResponse)}, '*');
        `);
    }
}

// Listen for messages from all webviews
window.addEventListener('message', async (event) => {
    // Find the webview that sent this message
    if (event.data && event.data.type === 'OMEGA_WALLET_REQUEST') {
        const webviews = document.querySelectorAll('webview');
        for (const webview of webviews) {
            // Check if message came from this webview (approximate check)
            await handleWalletRequest(webview, event.data);
            break; // Handle first matching for now
        }
    }
});

