// Omega Sheets Application
let currentWindowId = null;
let spreadsheet = {};
let selectedCell = null;
let currentFileName = null;
let hasUnsavedChanges = false;

const ROWS = 100;
const COLS = 26; // A-Z
const COL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
    setupWindowControls();

    // Initialize spreadsheet
    initializeSpreadsheet();

    // Setup toolbar
    setupToolbar();

    // Setup file operations
    setupFileOperations();
});

function setupWindowControls() {
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
}

function initializeSpreadsheet() {
    const columnHeaders = document.getElementById('columnHeaders');
    const rowNumbers = document.getElementById('rowNumbers');
    const cellsContainer = document.getElementById('cellsContainer');
    const cellsGrid = document.createElement('div');
    cellsGrid.className = 'cells-grid';
    cellsGrid.style.display = 'table';

    // Create column headers
    for (let i = 0; i < COLS; i++) {
        const header = document.createElement('div');
        header.className = 'column-header';
        header.textContent = COL_NAMES[i];
        columnHeaders.appendChild(header);
    }

    // Create rows
    for (let row = 1; row <= ROWS; row++) {
        const rowNum = document.createElement('div');
        rowNum.className = 'row-number';
        rowNum.textContent = row;
        rowNumbers.appendChild(rowNum);

        const cellRow = document.createElement('div');
        cellRow.className = 'cell-row';
        cellRow.style.display = 'table-row';

        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.contentEditable = true;
            cell.dataset.row = row;
            cell.dataset.col = COL_NAMES[col];
            cell.dataset.address = COL_NAMES[col] + row;

            // Cell events
            cell.addEventListener('focus', () => selectCell(cell));
            cell.addEventListener('blur', () => {
                cell.classList.remove('editing');
                // Recalculate formulas that might depend on this cell
                recalculateDependentCells(cell.dataset.address);
            });
            cell.addEventListener('input', () => {
                const address = cell.dataset.address;
                const value = cell.textContent;
                
                // Remove old formula if editing
                delete cell.dataset.formula;
                delete spreadsheet[address + '_formula'];
                
                // Check if it's a formula and calculate
                if (value.startsWith('=')) {
                    const result = calculateFormula(value, address);
                    if (result !== null && result !== undefined && result !== '#ERROR') {
                        cell.dataset.formula = value;
                        cell.textContent = result;
                        spreadsheet[address] = result;
                        spreadsheet[address + '_formula'] = value;
                    } else {
                        spreadsheet[address] = value;
                    }
                } else {
                    spreadsheet[address] = value;
                }
                
                hasUnsavedChanges = true;
                updateWindowTitle();
                updateFormulaBar();
            });
            cell.addEventListener('keydown', (e) => {
                handleCellKeydown(e, cell);
            });

            cellRow.appendChild(cell);
        }

        cellsGrid.appendChild(cellRow);
    }

    cellsContainer.appendChild(cellsGrid);
}

function selectCell(cell) {
    // Deselect previous
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    cell.classList.add('selected', 'editing');
    updateFormulaBar();
}

function updateFormulaBar() {
    const formulaBar = document.getElementById('formulaBar');
    if (selectedCell) {
        // Show formula if exists, otherwise show cell content
        const formula = selectedCell.dataset.formula;
        formulaBar.value = formula || selectedCell.textContent;
    } else {
        formulaBar.value = '';
    }
}

function handleCellKeydown(e, cell) {
    const row = parseInt(cell.dataset.row);
    const col = COL_NAMES.indexOf(cell.dataset.col);

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            navigateCell(row + 1, col);
            break;
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
                navigateCell(row, col - 1);
            } else {
                navigateCell(row, col + 1);
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateCell(row - 1, col);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateCell(row + 1, col);
            break;
        case 'ArrowLeft':
            if (cell.textContent.length === 0 || window.getSelection().toString() === cell.textContent) {
                e.preventDefault();
                navigateCell(row, col - 1);
            }
            break;
        case 'ArrowRight':
            const selection = window.getSelection();
            if (cell.textContent.length === 0 || selection.toString() === cell.textContent) {
                e.preventDefault();
                navigateCell(row, col + 1);
            }
            break;
    }
}

function navigateCell(row, col) {
    if (row < 1) row = 1;
    if (row > ROWS) row = ROWS;
    if (col < 0) col = 0;
    if (col >= COLS) col = COLS - 1;

    const address = COL_NAMES[col] + row;
    const cell = document.querySelector(`[data-address="${address}"]`);
    if (cell) {
        cell.focus();
        selectCell(cell);
    }
}

function setupToolbar() {
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const sumBtn = document.getElementById('sumBtn');
    const formulaBar = document.getElementById('formulaBar');

    boldBtn.addEventListener('click', () => {
        if (selectedCell) {
            document.execCommand('bold', false, null);
        }
    });

    italicBtn.addEventListener('click', () => {
        if (selectedCell) {
            document.execCommand('italic', false, null);
        }
    });

    sumBtn.addEventListener('click', () => {
        if (selectedCell) {
            const row = parseInt(selectedCell.dataset.row);
            const col = COL_NAMES.indexOf(selectedCell.dataset.col);
            // Simple sum for demo - sum cells above current cell
            let sum = 0;
            for (let r = 1; r < row; r++) {
                const addr = COL_NAMES[col] + r;
                const val = parseFloat(spreadsheet[addr] || 0);
                if (!isNaN(val)) sum += val;
            }
            selectedCell.textContent = sum;
            spreadsheet[selectedCell.dataset.address] = sum;
            hasUnsavedChanges = true;
            updateWindowTitle();
        }
    });

    formulaBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedCell) {
                const address = selectedCell.dataset.address;
                const value = formulaBar.value;
                
                if (value.startsWith('=')) {
                    // It's a formula
                    const result = calculateFormula(value, address);
                    selectedCell.dataset.formula = value;
                    if (result !== null && result !== undefined) {
                        selectedCell.textContent = result;
                        spreadsheet[address] = result;
                        spreadsheet[address + '_formula'] = value;
                    } else {
                        selectedCell.textContent = value;
                        spreadsheet[address] = value;
                    }
                } else {
                    selectedCell.textContent = value;
                    spreadsheet[address] = value;
                    delete spreadsheet[address + '_formula'];
                }
                
                hasUnsavedChanges = true;
                updateWindowTitle();
                selectedCell.focus();
            }
        }
    });
}

function setupFileOperations() {
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');

    newBtn.addEventListener('click', () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new spreadsheet anyway?')) {
                return;
            }
        }
        clearSpreadsheet();
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
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'CSV Files', extensions: ['csv'] },
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
        await saveSpreadsheet();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSpreadsheet();
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

function clearSpreadsheet() {
    spreadsheet = {};
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
    });
    currentFileName = null;
    hasUnsavedChanges = false;
    updateWindowTitle();
}

function loadSpreadsheet(data) {
    spreadsheet = data;
    document.querySelectorAll('.cell').forEach(cell => {
        const address = cell.dataset.address;
        // Restore formula if exists
        if (spreadsheet[address + '_formula']) {
            cell.dataset.formula = spreadsheet[address + '_formula'];
            const result = calculateFormula(spreadsheet[address + '_formula'], address);
            cell.textContent = (result !== null && result !== undefined) ? result : spreadsheet[address] || '';
        } else {
            cell.textContent = spreadsheet[address] || '';
            delete cell.dataset.formula;
        }
    });
}

// Formula calculation engine
function calculateFormula(formula, currentCellAddress) {
    if (!formula.startsWith('=')) return formula;
    
    try {
        // Remove the = sign
        let expression = formula.substring(1).trim();
        
        // Replace cell references with their values (e.g., A1, B2)
        expression = expression.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
            const address = col + row;
            const cellValue = spreadsheet[address];
            if (cellValue === undefined || cellValue === null || cellValue === '') return '0';
            // If it's a number, return it, otherwise return 0
            const num = parseFloat(cellValue);
            return isNaN(num) ? '0' : num.toString();
        });
        
        // Basic math operations
        // Use Function constructor for safe evaluation (still limited)
        // Only allow basic math operations
        if (/^[0-9+\-*/().\s]+$/.test(expression)) {
            const result = Function('"use strict"; return (' + expression + ')')();
            return result;
        }
        
        // Handle SUM function (SUM(A1:A5) or SUM(A1,B2,C3))
        if (expression.toUpperCase().startsWith('SUM(')) {
            const sumMatch = expression.match(/SUM\(([^)]+)\)/i);
            if (sumMatch) {
                const args = sumMatch[1];
                let sum = 0;
                
                // Handle range (A1:A5)
                const rangeMatch = args.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
                if (rangeMatch) {
                    const startCol = COL_NAMES.indexOf(rangeMatch[1]);
                    const startRow = parseInt(rangeMatch[2]);
                    const endCol = COL_NAMES.indexOf(rangeMatch[3]);
                    const endRow = parseInt(rangeMatch[4]);
                    
                    for (let r = startRow; r <= endRow; r++) {
                        const startC = Math.min(startCol, endCol);
                        const endC = Math.max(startCol, endCol);
                        for (let c = startC; c <= endC; c++) {
                            const addr = COL_NAMES[c] + r;
                            const val = parseFloat(spreadsheet[addr] || 0);
                            if (!isNaN(val)) sum += val;
                        }
                    }
                } else {
                    // Handle comma-separated list (A1,B2,C3)
                    const cells = args.split(',');
                    cells.forEach(cellRef => {
                        cellRef = cellRef.trim();
                        const val = parseFloat(spreadsheet[cellRef] || 0);
                        if (!isNaN(val)) sum += val;
                    });
                }
                return sum;
            }
        }
        
        return formula; // Return original if can't calculate
    } catch (error) {
        console.error('Formula calculation error:', error);
        return '#ERROR';
    }
}

async function saveSpreadsheet() {
    const dataStr = JSON.stringify(spreadsheet, null, 2);
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: currentFileName || 'spreadsheet.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                await window.electronAPI.writeFile(result.filePath, dataStr);
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
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'spreadsheet.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges = false;
        updateWindowTitle();
    }
}

function recalculateDependentCells(changedAddress) {
    // Find all cells with formulas that reference the changed cell
    document.querySelectorAll('.cell[data-formula]').forEach(cell => {
        const formula = cell.dataset.formula;
        const address = cell.dataset.address;
        
        // Check if formula references the changed cell
        if (formula && formula.includes(changedAddress)) {
            const result = calculateFormula(formula, address);
            if (result !== null && result !== undefined && result !== '#ERROR') {
                cell.textContent = result;
                spreadsheet[address] = result;
            }
        }
    });
}

async function loadFile(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            const ext = filePath.split('.').pop().toLowerCase();
            
            let data;
            if (ext === 'csv') {
                // Parse CSV to JSON format
                const lines = content.split('\n').filter(line => line.trim());
                data = {};
                lines.forEach((line, rowIndex) => {
                    const cols = line.split(',');
                    cols.forEach((cell, colIndex) => {
                        const address = COL_NAMES[colIndex] + (rowIndex + 1);
                        data[address] = cell.trim();
                    });
                });
            } else {
                // Parse JSON
                data = JSON.parse(content);
            }
            
            loadSpreadsheet(data);
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
    title.textContent = hasUnsavedChanges ? `Omega Sheets - ${fileName} *` : `Omega Sheets - ${fileName}`;
}
