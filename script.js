let allEnchantments = [];
// New data structure: tracks both completion status and individual levels
// Format: { 'enchantment_name': { complete: boolean, levels: { 1: boolean, 2: boolean, ... } } }
let enchantmentData = {};
// View mode: 'card' or 'list'
let currentView = localStorage.getItem('viewMode') || 'card';

// Item group definitions - single source of truth for item types and their icons
const ITEM_GROUPS = {
    sword: { icon: 'diamond_sword.png', label: 'Swords' },
    axe: { icon: 'diamond_axe.png', label: 'Axes' },
    pickaxe: { icon: 'diamond_pickaxe.png', label: 'Pickaxes' },
    shovel: { icon: 'diamond_shovel.png', label: 'Shovels' },
    hoe: { icon: 'diamond_hoe.png', label: 'Hoes' },
    helmet: { icon: 'diamond_helmet.png', label: 'Helmets' },
    chestplate: { icon: 'diamond_chestplate.png', label: 'Chestplates' },
    leggings: { icon: 'diamond_leggings.png', label: 'Leggings' },
    boots: { icon: 'diamond_boots.png', label: 'Boots' },
    bow: { icon: 'bow.png', label: 'Bows' },
    crossbow: { icon: 'crossbow_standby.png', label: 'Crossbows' },
    trident: { icon: 'trident.png', label: 'Tridents' },
    compass: { icon: 'compass_00.png', label: 'Compasses' },
    mace: { icon: 'mace.png', label: 'Maces' },
    fishing_rod: { icon: 'fishing_rod.png', label: 'Fishing Rods' },
    head: { icon: 'player_head.svg', label: 'Heads' },
    elytra: { icon: 'elytra.png', label: 'Elytra' },
    shield: { icon: 'shield.svg', label: 'Shields' },
    shears: { icon: 'shears.png', label: 'Shears' },
    flint_and_steel: { icon: 'flint_and_steel.png', label: 'Flint and Steel' },
    brush: { icon: 'brush.png', label: 'Brushes' }
};

// Get icon path for item name (returns generic group icon if applicable)
function getItemIcon(itemFullName) {
    // Extract item name from minecraft:item_name format
    const parts = itemFullName.split(':');
    const itemName = parts[parts.length - 1];

    // Check if this is a known item group
    const baseType = getBaseItemType(itemFullName);
    if (ITEM_GROUPS[baseType]) {
        return `item_icons/${ITEM_GROUPS[baseType].icon}`;
    }

    // Return the path to the icon
    return `item_icons/${itemName}.png`;
}

// Get specific icon path for item name (always returns the specific item icon, not the group icon)
function getSpecificItemIcon(itemFullName) {
    // Extract item name from minecraft:item_name format
    const parts = itemFullName.split(':');
    const itemName = parts[parts.length - 1];

    // Special handling: heads and skulls don't have item textures in Minecraft
    // Use SVG icons for common mob heads, fallback to generic player_head
    const baseType = getBaseItemType(itemFullName);
    if (baseType === 'head') {
        // Map specific heads to their SVG icons
        const headSvgMap = {
            'zombie_head': 'zombie_head.svg',
            'skeleton_skull': 'skeleton_skull.svg',
            'wither_skeleton_skull': 'wither_skeleton_skull.svg',
            'creeper_head': 'creeper_head.svg',
            'dragon_head': 'dragon_head.svg',
            'piglin_head': 'piglin_head.svg',
            'carved_pumpkin': 'carved_pumpkin.png'
        };

        // Use specific SVG if available, otherwise use generic player head
        return `item_icons/${headSvgMap[itemName] || ITEM_GROUPS.head.icon}`;
    }

    // Special handling: items with non-standard texture filenames
    const specialTextureMap = {
        'crossbow': 'crossbow_standby.png',
        'compass': 'compass_00.png',
        'shield': 'shield.svg'
    };

    if (specialTextureMap[itemName]) {
        return `item_icons/${specialTextureMap[itemName]}`;
    }

    // Return the specific item's icon
    return `item_icons/${itemName}.png`;
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

// Load enchantments for selected version
async function loadVersionEnchantments() {
    const versionKey = document.getElementById('versionSelect').value;
    try {
        // versionKey format: "java_1.21.10" or "bedrock_1.21.10"
        const response = await fetch(`enchantments/${versionKey}.json`);
        if (!response.ok) {
            throw new Error(`Version ${versionKey} not found`);
        }
        const data = await response.json();
        allEnchantments = data;
        renderEnchantments();
    } catch (error) {
        alert(`Error loading enchantments: ${error.message}`);
        console.error('Error loading enchantments:', error);
    }
}

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

// Initialize popovers for item tags with variants
function initPopovers() {
    document.querySelectorAll('.item-tag[data-variants]').forEach(tag => {
        const variantsJson = tag.getAttribute('data-variants');
        const popover = tag.querySelector('.item-popover');
        if (popover && variantsJson) {
            try {
                const variants = JSON.parse(variantsJson);
                // Create HTML with icons for each variant
                const variantHTML = variants.map(v =>
                    `<div class="popover-item"><img src="${v.icon}" class="popover-icon" onerror="this.src='item_icons/barrier.png'" alt="${v.name}">${v.name}</div>`
                ).join('');
                popover.innerHTML = variantHTML;
            } catch (e) {
                console.error('Error parsing variant data:', e);
            }
        }
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
    initPopovers();
}

// Extract base item type from item name (e.g., "diamond_sword" -> "sword")
function getBaseItemType(itemName) {
    const parts = itemName.split(':');
    const name = parts[parts.length - 1];

    // Special case: all mob heads and skulls should be grouped together
    if (name.endsWith('_head') || name === 'head' || name.endsWith('_skull') || name === 'skull') {
        return 'head';
    }

    // Check against all defined item groups
    // Sort by length descending to check longer/more specific names first (e.g., "pickaxe" before "axe")
    const types = Object.keys(ITEM_GROUPS).sort((a, b) => b.length - a.length);
    for (const type of types) {
        if (name.includes(type)) {
            return type;
        }
    }

    return name; // Return as-is if no match
}

// Organize items: group by type and return only generic representatives with their variants
function organizeItemsWithGenerics(itemsList) {
    // Group items by base type
    const itemsByType = {};
    const standaloneItems = [];

    itemsList.forEach(item => {
        const parts = item.split(':');
        const itemName = parts[parts.length - 1];
        const baseType = getBaseItemType(item);

        // If the item name is exactly the base type, it's standalone
        if (itemName === baseType) {
            standaloneItems.push(item);
        } else {
            if (!itemsByType[baseType]) {
                itemsByType[baseType] = [];
            }
            itemsByType[baseType].push(item);
        }
    });

    // Build result: only generic types with their variants attached
    const result = [];
    const processedTypes = new Set();

    // Add generic items for types that have variants
    for (const baseType in itemsByType) {
        if (itemsByType[baseType].length > 0) {
            result.push({
                item: `minecraft:${baseType}`,
                isGeneric: true,
                variants: itemsByType[baseType]
            });
            processedTypes.add(baseType);
        }
    }

    // Add standalone items (items that are already generic)
    standaloneItems.forEach(item => {
        const baseType = getBaseItemType(item);
        if (!processedTypes.has(baseType)) {
            result.push({
                item: item,
                isGeneric: false,
                variants: []
            });
        }
    });

    return result;
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

        // Organize items - now returns only generic types with variants attached
        const organizedItems = organizeItemsWithGenerics(enchant.applies_to);

        // Format item names with icons and variant information
        const items = organizedItems.map(({item, isGeneric, variants}) => {
            const parts = item.split(':');
            const itemName = parts[parts.length - 1].replace(/_/g, ' ');
            const iconPath = getItemIcon(item);

            // Format variants for popover with icons, sorted alphabetically
            let variantData = [];
            if (variants && variants.length > 0) {
                // Sort variants alphabetically
                const sortedVariants = [...variants].sort();
                variantData = sortedVariants.map(v => {
                    const vParts = v.split(':');
                    const vName = vParts[vParts.length - 1].replace(/_/g, ' ');
                    const vIcon = getSpecificItemIcon(v);
                    return { name: vName, icon: vIcon };
                });
            }

            return {
                name: itemName,
                iconPath: iconPath,
                isGeneric: isGeneric,
                variantData: variantData
            };
        });

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
                            ${items.map(item => {
                                const hasVariants = item.variantData && item.variantData.length > 0;
                                const variantsJson = hasVariants ? ` data-variants='${JSON.stringify(item.variantData)}'` : '';
                                const variantCount = hasVariants ? ` <span class="variant-count">(${item.variantData.length})</span>` : '';
                                return `<span class="item-tag ${item.isGeneric ? 'generic-item' : ''}"${variantsJson}><img src="${item.iconPath}" class="item-icon" onerror="this.src='item_icons/barrier.png'" alt="${item.name}">${item.name}${variantCount}${hasVariants ? '<div class="item-popover"></div>' : ''}</span>`;
                            }).join('')}
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

// Initialize item type dropdown from ITEM_GROUPS
function initItemTypeDropdown() {
    const optionsContainer = document.getElementById('itemTypeOptions');

    // Clear existing options except "All Items"
    optionsContainer.innerHTML = '<div data-value="all">All Items</div>';

    // Add options from ITEM_GROUPS
    for (const [key, config] of Object.entries(ITEM_GROUPS)) {
        const option = document.createElement('div');
        option.setAttribute('data-value', key);
        option.innerHTML = `<img src="item_icons/${config.icon}" class="select-icon">${config.label}`;
        optionsContainer.appendChild(option);
    }

    // Add click handlers to all options
    document.querySelectorAll('#itemTypeOptions div').forEach(option => {
        option.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            currentItemTypeFilter = value;
            document.getElementById('itemTypeSelected').innerHTML = this.innerHTML;
            document.getElementById('itemTypeOptions').classList.add('select-hide');
            renderEnchantments();
        });
    });
}

// Custom dropdown functionality
let currentItemTypeFilter = 'all';

document.getElementById('itemTypeSelected').addEventListener('click', function() {
    document.getElementById('itemTypeOptions').classList.toggle('select-hide');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select')) {
        document.getElementById('itemTypeOptions').classList.add('select-hide');
    }
});

// Event listeners for filters
document.getElementById('biomeFilter').addEventListener('change', renderEnchantments);
document.getElementById('showFilter').addEventListener('change', renderEnchantments);
document.getElementById('searchInput').addEventListener('input', renderEnchantments);

// Initialize
loadProgress();
loadVersionEnchantments();
initItemTypeDropdown();

// Set initial view button text
document.addEventListener('DOMContentLoaded', function() {
    const viewBtn = document.getElementById('viewToggle');
    if (viewBtn) {
        viewBtn.textContent = currentView === 'card' ? '☰ List View' : '▦ Card View';
    }
});
