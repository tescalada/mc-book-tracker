let allEnchantments = [];
// New data structure: tracks both completion status and individual levels
// Format: { 'enchantment_name': { complete: boolean, levels: { 1: boolean, 2: boolean, ... } } }
let enchantmentData = {};
// View mode: 'card' or 'list'
let currentView = localStorage.getItem('viewMode') || 'card';

// Get icon path for item name
function getItemIcon(itemFullName) {
    // Extract item name from minecraft:item_name format
    const parts = itemFullName.split(':');
    const itemName = parts[parts.length - 1];

    // Special cases for items with non-standard filenames
    const specialCases = {
        'crossbow': 'crossbow_standby.png'
    };

    if (specialCases[itemName]) {
        return `item_icons/${specialCases[itemName]}`;
    }

    // Return the path to the icon
    return `item_icons/${itemName}.png`;
}

// Get fallback icon for item category
function getCategoryIcon(itemName) {
    const lowerItem = itemName.toLowerCase();

    // Map item types to a representative icon
    const categoryMap = {
        'sword': 'diamond_sword.png',
        'axe': 'diamond_axe.png',
        'pickaxe': 'diamond_pickaxe.png',
        'shovel': 'diamond_shovel.png',
        'hoe': 'diamond_hoe.png',
        'bow': 'bow.png',
        'crossbow': 'crossbow_standby.png',
        'trident': 'trident.png',
        'mace': 'mace.png',
        'helmet': 'diamond_helmet.png',
        'chestplate': 'diamond_chestplate.png',
        'leggings': 'diamond_leggings.png',
        'boots': 'diamond_boots.png',
        'fishing_rod': 'fishing_rod.png',
        'elytra': 'elytra.png',
        'shield': 'shield.png',
        'book': 'book.png'
    };

    for (const [key, icon] of Object.entries(categoryMap)) {
        if (lowerItem.includes(key)) {
            return `item_icons/${icon}`;
        }
    }

    return 'item_icons/barrier.png'; // Default icon
}

// Check if enchantment applies to item type
function appliesToItemType(enchant, itemType) {
    if (itemType === 'all') return true;
    return enchant.applies_to.some(item =>
        item.toLowerCase().includes(itemType)
    );
}

// Convert rarity weight to readable label
function getRarityLabel(weight) {
    if (weight >= 10) return 'Very Common';
    if (weight >= 5) return 'Common';
    if (weight >= 2) return 'Uncommon';
    return 'Rare';
}

// Toggle view mode
function toggleView() {
    currentView = currentView === 'card' ? 'list' : 'card';
    localStorage.setItem('viewMode', currentView);

    // Update button text
    const viewBtn = document.getElementById('viewToggle');
    if (viewBtn) {
        viewBtn.textContent = currentView === 'card' ? '☰ List View' : '▦ Card View';
    }

    renderEnchantments();
}

// Load saved progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('librarianTracker');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            enchantmentData = data.enchantments || {};
        } catch (error) {
            console.error('Error loading progress:', error);
            enchantmentData = {};
        }
    }
}

// Save progress to localStorage
function saveProgress() {
    const data = {
        version: 2,
        enchantments: enchantmentData,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('librarianTracker', JSON.stringify(data));
}

// Load enchantments from file
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            allEnchantments = JSON.parse(event.target.result);
            renderEnchantments();
        } catch (error) {
            alert('Error loading JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Initialize enchantment data if not exists
function initEnchantmentData(name) {
    if (!enchantmentData[name]) {
        const enchant = allEnchantments.find(e => e.name === name);
        const maxLevel = enchant ? enchant.max_level : 1;

        const levels = {};
        for (let i = 1; i <= maxLevel; i++) {
            levels[i] = false;
        }

        enchantmentData[name] = {
            complete: false,
            levels: levels
        };
    }
}

// Toggle enchantment complete status
function toggleEnchantment(name) {
    initEnchantmentData(name);
    enchantmentData[name].complete = !enchantmentData[name].complete;
    saveProgress();
    renderEnchantments();
}

// Toggle specific level for an enchantment
function toggleEnchantmentLevel(name, level) {
    initEnchantmentData(name);
    enchantmentData[name].levels[level] = !enchantmentData[name].levels[level];
    saveProgress();
    renderEnchantments();
}

// Check if enchantment is complete
function isEnchantmentComplete(name) {
    return enchantmentData[name]?.complete || false;
}

// Check if enchantment has any levels checked
function hasAnyLevels(name) {
    if (!enchantmentData[name]) return false;
    return Object.values(enchantmentData[name].levels).some(checked => checked);
}

// Get count of checked levels
function getCheckedLevelsCount(name) {
    if (!enchantmentData[name]) return 0;
    return Object.values(enchantmentData[name].levels).filter(checked => checked).length;
}

// Filter enchantments
function getFilteredEnchantments() {
    const biomeFilter = document.getElementById('biomeFilter').value;
    const showFilter = document.getElementById('showFilter').value;
    const itemTypeFilter = currentItemTypeFilter;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    return allEnchantments.filter(enchant => {
        // Biome filter
        if (biomeFilter === 'tradeable' && !enchant.tradeable) return false;
        if (biomeFilter !== 'all' && biomeFilter !== 'tradeable') {
            if (!enchant.librarian_biomes.includes(biomeFilter)) return false;
        }

        // Collection status filter
        const isCollected = isEnchantmentComplete(enchant.name);
        if (showFilter === 'collected' && !isCollected) return false;
        if (showFilter === 'missing' && isCollected) return false;

        // Item type filter
        if (!appliesToItemType(enchant, itemTypeFilter)) return false;

        // Search filter
        if (searchText && !enchant.name.toLowerCase().includes(searchText) &&
            !enchant.description.toLowerCase().includes(searchText)) {
            return false;
        }

        return true;
    });
}

// Render enchantments
function renderEnchantments() {
    const grid = document.getElementById('enchantmentsGrid');
    const filtered = getFilteredEnchantments();

    // Update grid class based on view mode
    grid.className = currentView === 'list' ? 'enchantments-list' : 'enchantments-grid';

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h2>No enchantments found</h2><p>Try adjusting your filters</p></div>';
        updateStats();
        return;
    }

    if (currentView === 'list') {
        grid.innerHTML = renderListView(filtered);
    } else {
        grid.innerHTML = renderCardView(filtered);
    }

    updateStats();
}

// Render card view
function renderCardView(filtered) {
    return filtered.map(enchant => {
        const isCollected = isEnchantmentComplete(enchant.name);
        const hasLevels = hasAnyLevels(enchant.name);

        // Determine card class based on status
        let cardClass = '';
        if (!enchant.tradeable) {
            cardClass = 'not-tradeable';
        } else if (isCollected) {
            cardClass = 'collected';
        } else if (hasLevels) {
            cardClass = 'partial-progress';
        }

        // Generate level badges
        const levelBadgesHTML = [];
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        for (let i = 1; i <= enchant.max_level; i++) {
            const isChecked = enchantmentData[enchant.name]?.levels[i] || false;
            const badgeClass = isChecked ? 'level-badge checked' : 'level-badge';
            levelBadgesHTML.push(
                `<button class="${badgeClass}" onclick="toggleEnchantmentLevel('${enchant.name}', ${i})">${romanNumerals[i - 1] || i}</button>`
            );
        }

        // Format item names with icons
        const items = enchant.applies_to.slice(0, 10).map(item => {
            const parts = item.split(':');
            const itemName = parts[parts.length - 1].replace(/_/g, ' ');
            const iconPath = getItemIcon(item);
            return { name: itemName, iconPath: iconPath };
        });
        const moreItems = enchant.applies_to.length > 10 ? ` (+${enchant.applies_to.length - 10} more)` : '';

        return `
            <div class="enchantment-card ${cardClass}">
                <div class="card-header">
                    <div class="checkbox-wrapper">
                        <input type="checkbox"
                            ${isCollected ? 'checked' : ''}
                            onchange="toggleEnchantment('${enchant.name}')"
                            title="Mark as complete">
                    </div>
                    <div class="card-title">
                        <div class="enchant-name">${enchant.description}</div>
                    </div>
                </div>

                <div class="level-selector">
                    <label class="level-label">Levels:</label>
                    <div class="level-badges">
                        ${levelBadgesHTML.join('')}
                    </div>
                </div>

                ${enchant.tradeable ? `
                    <div class="biome-tags">
                        ${enchant.librarian_biomes.map(biome =>
                            `<span class="biome-tag ${biome === 'any' ? 'any' : ''}">${biome}</span>`
                        ).join('')}
                    </div>
                ` : `
                    <span class="not-tradeable-badge">⚠️ Not Available from Librarians</span>
                `}

                <div class="card-details">
                    <div class="detail">
                        <span class="detail-label">Max Level:</span>
                        <span class="detail-value">${enchant.max_level}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">Rarity:</span>
                        <span class="detail-value">${getRarityLabel(enchant.rarity_weight)}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">Min Cost:</span>
                        <span class="detail-value">${enchant.min_cost}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">Max Cost:</span>
                        <span class="detail-value">${enchant.max_cost}</span>
                    </div>
                    <div class="applies-to">
                        <span class="applies-to-label">Applies to:</span>
                        <div class="item-list">
                            ${items.map(item =>
                                `<span class="item-tag"><img src="${item.iconPath}" class="item-icon" onerror="this.src='item_icons/barrier.png'" alt="${item.name}">${item.name}</span>`
                            ).join('')}
                            ${moreItems ? `<span class="item-tag"><img src="item_icons/barrier.png" class="item-icon" alt="more">${moreItems}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render list view
function renderListView(filtered) {
    return `
        <div class="list-view-container">
            ${filtered.map(enchant => {
                const isCollected = isEnchantmentComplete(enchant.name);
                const hasLevels = hasAnyLevels(enchant.name);

                // Determine row class based on status
                let rowClass = 'list-item';
                if (!enchant.tradeable) {
                    rowClass += ' not-tradeable';
                } else if (isCollected) {
                    rowClass += ' collected';
                } else if (hasLevels) {
                    rowClass += ' partial-progress';
                }

                // Generate level badges
                const levelBadgesHTML = [];
                const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
                for (let i = 1; i <= enchant.max_level; i++) {
                    const isChecked = enchantmentData[enchant.name]?.levels[i] || false;
                    const badgeClass = isChecked ? 'level-badge checked' : 'level-badge';
                    levelBadgesHTML.push(
                        `<button class="${badgeClass}" onclick="toggleEnchantmentLevel('${enchant.name}', ${i})">${romanNumerals[i - 1] || i}</button>`
                    );
                }

                return `
                    <div class="${rowClass}">
                        <div class="list-item-checkbox">
                            <input type="checkbox"
                                ${isCollected ? 'checked' : ''}
                                onchange="toggleEnchantment('${enchant.name}')"
                                title="Mark as complete">
                        </div>
                        <div class="list-item-name">${enchant.description}</div>
                        <div class="list-item-levels">
                            ${levelBadgesHTML.join('')}
                        </div>
                        <div class="list-item-biomes">
                            ${enchant.tradeable ?
                                enchant.librarian_biomes.slice(0, 3).map(biome =>
                                    `<span class="biome-tag ${biome === 'any' ? 'any' : ''}">${biome}</span>`
                                ).join('') + (enchant.librarian_biomes.length > 3 ? `<span class="biome-more">+${enchant.librarian_biomes.length - 3}</span>` : '')
                                : `<span class="not-tradeable-badge-small">⚠️</span>`
                            }
                        </div>
                        <div class="list-item-rarity">${getRarityLabel(enchant.rarity_weight)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Update statistics
function updateStats() {
    const tradeable = allEnchantments.filter(e => e.tradeable);
    const collected = tradeable.filter(e => isEnchantmentComplete(e.name)).length;
    const total = tradeable.length;
    const percentage = total > 0 ? Math.round((collected / total) * 100) : 0;

    document.getElementById('collectedCount').textContent = collected;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('progressBar').textContent = `${collected} / ${total} (${percentage}%)`;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

// Clear all collected enchantments
function clearAll() {
    if (confirm('Are you sure you want to clear all progress (complete status and levels)?')) {
        enchantmentData = {};
        saveProgress();
        renderEnchantments();
    }
}

// Export progress
function exportData() {
    const data = {
        version: 2,
        enchantments: enchantmentData,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'librarian-tracker-progress.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Import progress
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                enchantmentData = data.enchantments || {};
                saveProgress();
                renderEnchantments();
                alert('Progress imported successfully!');
            } catch (error) {
                alert('Error importing progress: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Custom dropdown functionality
let currentItemTypeFilter = 'all';

document.getElementById('itemTypeSelected').addEventListener('click', function() {
    document.getElementById('itemTypeOptions').classList.toggle('select-hide');
});

document.querySelectorAll('#itemTypeOptions div').forEach(option => {
    option.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        currentItemTypeFilter = value;
        document.getElementById('itemTypeSelected').innerHTML = this.innerHTML;
        document.getElementById('itemTypeOptions').classList.add('select-hide');
        renderEnchantments();
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select')) {
        document.getElementById('itemTypeOptions').classList.add('select-hide');
    }
});

// Auto-load enchantments from default file
async function autoLoadEnchantments() {
    try {
        const response = await fetch('enchantments/enchantments_1.21.10.json');
        if (response.ok) {
            const data = await response.json();
            allEnchantments = data;
            document.getElementById('fileName').textContent = 'enchantments_1.21.10.json (auto-loaded)';
            renderEnchantments();
        }
    } catch (error) {
        // File not found or error loading - user can still manually load
        console.log('Auto-load failed, waiting for manual file selection');
    }
}

// Event listeners for filters
document.getElementById('biomeFilter').addEventListener('change', renderEnchantments);
document.getElementById('showFilter').addEventListener('change', renderEnchantments);
document.getElementById('searchInput').addEventListener('input', renderEnchantments);

// Initialize
loadProgress();
autoLoadEnchantments();

// Set initial view button text
document.addEventListener('DOMContentLoaded', function() {
    const viewBtn = document.getElementById('viewToggle');
    if (viewBtn) {
        viewBtn.textContent = currentView === 'card' ? '☰ List View' : '▦ Card View';
    }
});
