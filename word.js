// Omega Word Application
let currentWindowId = null;
let documentContent = '';
let currentFileName = null;
let hasUnsavedChanges = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
        
        // Listen for open file event
        window.electronAPI.onOpenFile((filePath) => {
            loadFile(filePath);
        });
    }

    // Window Controls
    document.getElementById('minimizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMinimize(currentWindowId);
        }
    });

    document.getElementById('maximizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMaximize(currentWindowId);
        }
    });

    document.getElementById('closeBtn').addEventListener('click', () => {
        if (hasUnsavedChanges) {
            if (confirm('You have unsaved changes. Close anyway?')) {
                if (currentWindowId && window.electronAPI) {
                    window.electronAPI.appWindowClose(currentWindowId);
                }
            }
        } else {
            if (currentWindowId && window.electronAPI) {
                window.electronAPI.appWindowClose(currentWindowId);
            }
        }
    });

    // Toolbar Buttons
    setupToolbar();

    // Editor
    setupEditor();

    // File Operations
    setupFileOperations();
});

function setupToolbar() {
    const editor = document.getElementById('editor');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const strikethroughBtn = document.getElementById('strikethroughBtn');
    const alignLeftBtn = document.getElementById('alignLeftBtn');
    const alignCenterBtn = document.getElementById('alignCenterBtn');
    const alignRightBtn = document.getElementById('alignRightBtn');
    const bulletListBtn = document.getElementById('bulletListBtn');
    const numberListBtn = document.getElementById('numberListBtn');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const fontColorPicker = document.getElementById('fontColorPicker');

    // Format buttons
    boldBtn.addEventListener('click', () => {
        document.execCommand('bold', false, null);
        updateToolbarState();
    });

    italicBtn.addEventListener('click', () => {
        document.execCommand('italic', false, null);
        updateToolbarState();
    });

    underlineBtn.addEventListener('click', () => {
        document.execCommand('underline', false, null);
        updateToolbarState();
    });

    strikethroughBtn.addEventListener('click', () => {
        document.execCommand('strikeThrough', false, null);
        updateToolbarState();
    });

    bulletListBtn.addEventListener('click', () => {
        document.execCommand('insertUnorderedList', false, null);
    });

    numberListBtn.addEventListener('click', () => {
        document.execCommand('insertOrderedList', false, null);
    });

    // Font family
    fontFamilySelect.addEventListener('change', (e) => {
        document.execCommand('fontName', false, e.target.value);
    });

    // Alignment
    alignLeftBtn.addEventListener('click', () => {
        document.execCommand('justifyLeft', false, null);
        updateToolbarState();
    });

    alignCenterBtn.addEventListener('click', () => {
        document.execCommand('justifyCenter', false, null);
        updateToolbarState();
    });

    alignRightBtn.addEventListener('click', () => {
        document.execCommand('justifyRight', false, null);
        updateToolbarState();
    });

    // Font size
    fontSizeSelect.addEventListener('change', (e) => {
        document.execCommand('fontSize', false, '3');
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.extractContents();
            const span = document.createElement('span');
            span.style.fontSize = e.target.value + 'pt';
            span.appendChild(selectedText);
            range.insertNode(span);
        }
    });

    // Font color
    fontColorPicker.addEventListener('change', (e) => {
        document.execCommand('foreColor', false, e.target.value);
    });

    // Update toolbar state on selection change
    editor.addEventListener('selectionchange', updateToolbarState);
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
}

function updateToolbarState() {
    const editor = document.getElementById('editor');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const strikethroughBtn = document.getElementById('strikethroughBtn');

    // Check formatting state
    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
    strikethroughBtn.classList.toggle('active', document.queryCommandState('strikeThrough'));
}

function setupEditor() {
    const editor = document.getElementById('editor');
    
    editor.addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateWindowTitle();
    });

    // Prevent default paste to preserve formatting
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        hasUnsavedChanges = true;
        updateWindowTitle();
    });
}

function setupFileOperations() {
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');

    newBtn.addEventListener('click', async () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new document anyway?')) {
                return;
            }
        }
        document.getElementById('editor').innerHTML = '<p>Start typing your document...</p>';
        currentFileName = null;
        hasUnsavedChanges = false;
        updateWindowTitle();
    });

    openBtn.addEventListener('click', async () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Open a new file anyway?')) {
                return;
            }
        }
        if (window.electronAPI && window.electronAPI.openFileDialog) {
            try {
                const result = await window.electronAPI.openFileDialog({
                    filters: [
                        { name: 'HTML Files', extensions: ['html', 'htm'] },
                        { name: 'Text Files', extensions: ['txt'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                    await loadFile(result.filePaths[0]);
                }
            } catch (error) {
                console.error('Error opening file:', error);
                alert('Error opening file: ' + error.message);
            }
        }
    });

    saveBtn.addEventListener('click', async () => {
        await saveDocument();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDocument();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            newBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            openBtn.click();
        }
    });
}

async function saveDocument() {
    const content = document.getElementById('editor').innerHTML;
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: currentFileName || 'document.html',
                filters: [
                    { name: 'HTML Files', extensions: ['html', 'htm'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                await window.electronAPI.writeFile(result.filePath, content);
                currentFileName = result.filePath.split(/[\\/]/).pop();
                hasUnsavedChanges = false;
                updateWindowTitle();
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'document.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges = false;
        updateWindowTitle();
    }
}

async function loadFile(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            document.getElementById('editor').innerHTML = content;
            currentFileName = filePath.split(/[\\/]/).pop();
            hasUnsavedChanges = false;
            updateWindowTitle();
        }
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
    }
}

function updateWindowTitle() {
    const title = document.querySelector('.window-title');
    const fileName = currentFileName || 'Untitled';
    title.textContent = hasUnsavedChanges ? `Omega Word - ${fileName} *` : `Omega Word - ${fileName}`;
}
