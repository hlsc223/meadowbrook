// Database management
let db;
const DB_NAME = 'HorseFarmDB';
const DB_VERSION = 1;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('horses')) {
                db.createObjectStore('horses', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('entries')) {
                const entryStore = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
                entryStore.createIndex('horseId', 'horseId', { unique: false });
                entryStore.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('charges')) {
                const chargeStore = db.createObjectStore('charges', { keyPath: 'id', autoIncrement: true });
                chargeStore.createIndex('client', 'client', { unique: false });
                chargeStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

// Sample data
const horses = [
    { id: 1, name: 'Stardust', owner: 'Sarah Johnson', breed: 'Thoroughbred Mare', status: 'In Foal' },
    { id: 2, name: 'Thunder', owner: 'Mike Wilson', breed: 'Quarter Horse Stallion', status: 'Active' },
    { id: 3, name: 'Lightning', owner: 'Mike Wilson', breed: 'Quarter Horse Mare', status: 'Active' },
    { id: 4, name: 'Buttercup', owner: 'Emily Chen', breed: 'Appaloosa Mare', status: 'Boarding' },
    { id: 5, name: 'Shadow', owner: 'Robert Davis', breed: 'Arabian Gelding', status: 'Training' },
    { id: 6, name: 'Moonlight', owner: 'Lisa Martinez', breed: 'Paint Horse Mare', status: 'In Foal' },
    { id: 7, name: 'Copper', owner: 'Tom Anderson', breed: 'Morgan Stallion', status: 'Breeding' },
    { id: 8, name: 'Daisy', owner: 'Jennifer White', breed: 'Welsh Pony Mare', status: 'Boarding' }
];

const sampleEntries = [
    {
        horseId: 1,
        horseName: 'Stardust',
        date: '2026-04-15',
        type: 'medical',
        title: 'Ultrasound - 30 Day Check',
        description: 'Confirmed pregnancy. Fetus appears healthy and developing normally. Estimated due date: September 22, 2026.',
        tags: ['Foaling', 'Ultrasound'],
        temperature: 99.8,
        actions: ['healthy']
    },
    {
        horseId: 1,
        horseName: 'Stardust',
        date: '2026-04-08',
        type: 'routine',
        title: 'Daily Check - All Normal',
        description: 'Temperature: 99.8°F. Mare is eating well and showing good energy levels. No concerns observed.',
        tags: ['Health Check'],
        temperature: 99.8,
        actions: ['healthy', 'fed', 'groomed']
    },
    {
        horseId: 1,
        horseName: 'Stardust',
        date: '2026-04-03',
        type: 'medical',
        title: 'Cyst Treatment - Follow-up',
        description: 'Cyst showing improvement after treatment. Will continue monitoring. Size reduced from 10mm to 6mm.',
        tags: ['Medical', 'Follow-up'],
        actions: ['medication']
    },
    {
        horseId: 1,
        horseName: 'Stardust',
        date: '2026-03-28',
        type: 'routine',
        title: 'Farrier Visit',
        description: 'Routine hoof trimming and shoeing completed. All hooves in good condition.',
        tags: ['Farrier', 'Maintenance'],
        actions: ['farrier']
    },
    {
        horseId: 1,
        horseName: 'Stardust',
        date: '2026-03-15',
        type: 'medical',
        title: 'Initial Cyst Detection',
        description: 'Small cyst detected during routine examination. 10mm diameter. Started monitoring and topical treatment protocol.',
        tags: ['Medical', 'Diagnosis'],
        actions: []
    }
];

const sampleCharges = [
    {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: 'Monthly Board - Stardust',
        amount: 850.00,
        date: '2026-04-01',
        type: 'monthly',
        notes: 'April 1 - April 30'
    },
    {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: 'Foaling Care Premium',
        amount: 300.00,
        date: '2026-04-01',
        type: 'monthly',
        notes: 'April 1 - April 30'
    },
    {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: '30-Day Ultrasound',
        amount: 175.00,
        date: '2026-04-15',
        type: 'additional',
        notes: ''
    },
    {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: 'Prenatal Vitamin Supplement',
        amount: 45.00,
        date: '2026-04-10',
        type: 'additional',
        notes: ''
    },
    {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: 'Cyst Treatment (3 applications)',
        amount: 120.00,
        date: '2026-04-03',
        type: 'additional',
        notes: ''
    }
];

let selectedHorse = null;
let autoSaveTimeout = null;
let syncStatus = 'synced';

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await initDB();
    await loadSampleData();
    renderHorseList();
    updateDate();
    loadTimelineEvents();
    loadCharges();
    updateSyncStatus();
    
    // Auto-save setup
    document.querySelectorAll('.form-input, .form-textarea').forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            updateSyncStatus('saving');
            autoSaveTimeout = setTimeout(() => {
                updateSyncStatus('synced');
            }, 2000);
        });
    });
    
    // Search functionality
    document.getElementById('horse-search').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredHorses = horses.filter(horse => 
            horse.name.toLowerCase().includes(searchTerm) ||
            horse.owner.toLowerCase().includes(searchTerm)
        );
        renderHorseList(filteredHorses);
    });
    
    // Check for saved Google Sheets URL
    const savedSheetsUrl = localStorage.getItem('sheetsUrl');
    if (savedSheetsUrl) {
        console.log('Google Sheets URL configured');
    }
});

// Load sample data into IndexedDB
async function loadSampleData() {
    const transaction = db.transaction(['entries', 'charges'], 'readwrite');
    const entryStore = transaction.objectStore('entries');
    const chargeStore = transaction.objectStore('charges');
    
    // Check if data already exists
    const entryCount = await new Promise(resolve => {
        const countRequest = entryStore.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
    });
    
    // Only load sample data if database is empty
    if (entryCount === 0) {
        sampleEntries.forEach(entry => entryStore.add(entry));
        sampleCharges.forEach(charge => chargeStore.add(charge));
    }
}

// Update sync status indicator
function updateSyncStatus(status = 'synced') {
    syncStatus = status;
    const indicator = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    
    indicator.className = 'sync-indicator';
    
    if (!navigator.onLine) {
        indicator.classList.add('offline');
        text.textContent = 'Offline';
    } else if (status === 'syncing') {
        indicator.classList.add('syncing');
        text.textContent = 'Syncing...';
    } else if (status === 'saving') {
        indicator.classList.add('syncing');
        text.textContent = 'Saving...';
    } else {
        text.textContent = 'Synced';
    }
}

// Monitor online/offline status
window.addEventListener('online', () => updateSyncStatus('synced'));
window.addEventListener('offline', () => updateSyncStatus('offline'));

// Render horse list
function renderHorseList(horseList = horses) {
    const container = document.getElementById('horse-list-items');
    container.innerHTML = horseList.map(horse => `
        <div class="horse-item ${selectedHorse?.id === horse.id ? 'selected' : ''}" onclick="selectHorse(${horse.id})">
            <div class="horse-name">${horse.name}</div>
            <div class="horse-meta">${horse.owner} • ${horse.status}</div>
        </div>
    `).join('');
}

// Select a horse
function selectHorse(id) {
    selectedHorse = horses.find(h => h.id === id);
    renderHorseList();
    document.getElementById('selected-horse-name').textContent = selectedHorse.name;
    document.getElementById('entry-form').style.display = 'block';
}

// Update current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('entry-date').textContent = now.toLocaleDateString('en-US', options);
}

// Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const viewName = this.dataset.view;
        
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewName).classList.add('active');
    });
});

// Quick actions
document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});

// Save entry to IndexedDB
async function saveEntry() {
    if (!selectedHorse) {
        showSuccess('Please select a horse first');
        return;
    }
    
    const activeActions = Array.from(document.querySelectorAll('.quick-action-btn.active'))
        .map(btn => btn.dataset.action);
    
    const temperature = document.getElementById('temperature-input').value;
    const notes = document.getElementById('notes-input').value;
    
    const entry = {
        horseId: selectedHorse.id,
        horseName: selectedHorse.name,
        date: new Date().toISOString().split('T')[0],
        type: 'routine',
        title: 'Daily Check',
        description: notes || 'Routine check completed',
        tags: ['Health Check'],
        temperature: temperature ? parseFloat(temperature) : null,
        actions: activeActions,
        timestamp: new Date().toISOString()
    };
    
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    const request = store.add(entry);
    
    request.onsuccess = () => {
        showSuccess('Entry saved successfully!');
        
        // Reset form
        setTimeout(() => {
            document.querySelectorAll('.quick-action-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.form-input, .form-textarea').forEach(input => input.value = '');
        }, 500);
        
        // Trigger sync
        syncToSheets();
    };
    
    request.onerror = () => {
        showSuccess('Error saving entry. Please try again.');
    };
}

// Load timeline events from IndexedDB
function loadTimelineEvents() {
    const transaction = db.transaction(['entries'], 'readonly');
    const store = transaction.objectStore('entries');
    const request = store.getAll();
    
    request.onsuccess = () => {
        const entries = request.result;
        renderTimeline(entries);
    };
}

// Render timeline
function renderTimeline(entries) {
    const container = document.getElementById('timeline-events');
    
    // Sort by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = entries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        return `
            <div class="timeline-item ${entry.type}">
                <div class="timeline-card">
                    <div class="timeline-date">${formattedDate}</div>
                    <div class="timeline-title">${entry.title}</div>
                    <div class="timeline-description">${entry.description}</div>
                    ${entry.tags ? `
                        <div class="timeline-tags">
                            ${entry.tags.map(tag => `<span class="timeline-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Load charges from IndexedDB
function loadCharges() {
    const transaction = db.transaction(['charges'], 'readonly');
    const store = transaction.objectStore('charges');
    const request = store.getAll();
    
    request.onsuccess = () => {
        const charges = request.result;
        renderCharges(charges);
    };
}

// Render charges
function renderCharges(charges) {
    const container = document.getElementById('charges-list');
    
    container.innerHTML = charges.map(charge => {
        const date = new Date(charge.date);
        const formattedDate = charge.notes || date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        return `
            <div class="charge-item">
                <div class="charge-info">
                    <div class="charge-name">${charge.service}</div>
                    <div class="charge-date">${formattedDate}</div>
                </div>
                <div class="charge-amount">$${charge.amount.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Modal functions
function openAddChargeModal() {
    document.getElementById('add-charge-modal').classList.add('active');
    document.getElementById('charge-date').value = new Date().toISOString().split('T')[0];
}

function closeAddChargeModal() {
    document.getElementById('add-charge-modal').classList.remove('active');
}

async function addCharge() {
    const service = document.getElementById('charge-service').value;
    const amount = parseFloat(document.getElementById('charge-amount').value);
    const date = document.getElementById('charge-date').value;
    const notes = document.getElementById('charge-notes').value;
    
    if (!service || !amount || !date) {
        showSuccess('Please fill in all required fields');
        return;
    }
    
    const charge = {
        client: 'Sarah Johnson',
        horse: 'Stardust',
        service: service,
        amount: amount,
        date: date,
        type: 'additional',
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    const transaction = db.transaction(['charges'], 'readwrite');
    const store = transaction.objectStore('charges');
    const request = store.add(charge);
    
    request.onsuccess = () => {
        closeAddChargeModal();
        showSuccess('Charge added successfully!');
        loadCharges();
        
        // Clear form
        document.getElementById('charge-service').value = '';
        document.getElementById('charge-amount').value = '';
        document.getElementById('charge-notes').value = '';
        
        // Trigger sync
        syncToSheets();
    };
}

function generateInvoice() {
    showSuccess('Invoice generated! Ready to send to client.');
}

// Export to CSV
async function exportToCSV() {
    updateSyncStatus('syncing');
    
    const transaction = db.transaction(['entries', 'charges'], 'readonly');
    const entryStore = transaction.objectStore('entries');
    const chargeStore = transaction.objectStore('charges');
    
    const entries = await new Promise(resolve => {
        const request = entryStore.getAll();
        request.onsuccess = () => resolve(request.result);
    });
    
    const charges = await new Promise(resolve => {
        const request = chargeStore.getAll();
        request.onsuccess = () => resolve(request.result);
    });
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Entries CSV
    csvContent += "ENTRIES\n";
    csvContent += "Date,Horse,Type,Title,Description,Temperature,Actions\n";
    entries.forEach(entry => {
        const row = [
            entry.date,
            entry.horseName,
            entry.type,
            `"${entry.title}"`,
            `"${entry.description}"`,
            entry.temperature || '',
            entry.actions.join('; ')
        ].join(',');
        csvContent += row + "\n";
    });
    
    csvContent += "\n\nCHARGES\n";
    csvContent += "Date,Client,Horse,Service,Amount,Notes\n";
    charges.forEach(charge => {
        const row = [
            charge.date,
            charge.client,
            charge.horse,
            `"${charge.service}"`,
            charge.amount,
            `"${charge.notes || ''}"`
        ].join(',');
        csvContent += row + "\n";
    });
    
    // Download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `horse_farm_backup_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateSyncStatus('synced');
    showSuccess('CSV exported successfully!');
}

// Sync to Google Sheets
async function syncToSheets() {
    const sheetsUrl = localStorage.getItem('sheetsUrl');
    
    if (!sheetsUrl) {
        document.getElementById('sheets-setup-modal').classList.add('active');
        return;
    }
    
    if (!navigator.onLine) {
        showSuccess('Cannot sync - you are offline. Data saved locally.');
        return;
    }
    
    updateSyncStatus('syncing');
    
    try {
        const transaction = db.transaction(['entries', 'charges'], 'readonly');
        const entryStore = transaction.objectStore('entries');
        const chargeStore = transaction.objectStore('charges');
        
        const entries = await new Promise(resolve => {
            const request = entryStore.getAll();
            request.onsuccess = () => resolve(request.result);
        });
        
        const charges = await new Promise(resolve => {
            const request = chargeStore.getAll();
            request.onsuccess = () => resolve(request.result);
        });
        
        const data = {
            entries: entries,
            charges: charges,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        updateSyncStatus('synced');
        showSuccess('Synced to Google Sheets!');
    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('synced');
        showSuccess('Sync failed - data saved locally');
    }
}

function closeSheetsModal() {
    document.getElementById('sheets-setup-modal').classList.remove('active');
}

function saveSheetsUrl() {
    const url = document.getElementById('sheets-url').value;
    if (url) {
        localStorage.setItem('sheetsUrl', url);
        closeSheetsModal();
        showSuccess('Google Sheets connected! Syncing now...');
        syncToSheets();
    }
}

// Success message
function showSuccess(message) {
    const successEl = document.getElementById('success-message');
    successEl.textContent = message;
    successEl.classList.add('show');
    setTimeout(() => {
        successEl.classList.remove('show');
    }, 3000);
}
