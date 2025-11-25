# Minecraft Librarian Trade Tracker

A web-based tool for tracking enchanted book trades from Minecraft librarian villagers. Keep track of which enchantments you've collected in your trading hall!

## Features

- 📚 Track all tradeable enchantments from librarian villagers
- 🗺️ Filter by biome-specific trades
- 🔍 Search and filter by item type
- 💾 Save progress locally in your browser
- 📤 Export/Import progress as JSON
- 🎨 Clean, responsive UI with item icons

## Related Tools

💡 **Inspired by [iamcal's Enchantment Order Calculator](https://iamcal.github.io/enchant-order/)**

Once you've collected your enchanted books, use iamcal's tool to combine them in the optimal order to minimize XP cost and avoid the "Too Expensive!" penalty.

## Quick Start

### Using the Web App

1. Open `index.html` in your browser
2. The app will automatically load the default enchantments data
3. Click checkboxes to mark enchantments as collected
4. Use filters to find specific enchantments

Your progress is automatically saved in your browser's local storage!

## Extracting Data from Minecraft

To extract enchantment data and icons from your own Minecraft installation, you'll need the Minecraft JAR file and Python 3.

### Prerequisites

- Python 3.9 or higher
- A Minecraft JAR file (e.g., `1.21.10.jar`)

### Step 1: Extract Enchantment Data

This script extracts all enchantment information including:
- Enchantment names and descriptions
- Which items they apply to
- Biome-specific librarian trades
- Min/max costs and rarity weights

**Usage:**
```bash
python scripts/extract_enchantments.py <jar_file> [output_file]
```

**Example:**
```bash
# Extract from Minecraft 1.21.10 JAR
python scripts/extract_enchantments.py ~/.minecraft/versions/1.21.10/1.21.10.jar enchantments/enchantments_1.21.10.json
```

**Output:**
- Creates a JSON file with all enchantment data
- Default output location: `enchantments.json`

### Step 2: Extract Item Icons

This script extracts item texture icons from the Minecraft JAR, but **only for enchantable items** to keep the file size manageable and to use the fewest number of offical assets possible (trying to keep their use to fair use).

**Usage:**
```bash
python scripts/extract_icons.py <jar_file> [output_dir] [enchantments_dir]
```

**Example:**
```bash
# Extract icons for enchantable items
python scripts/extract_icons.py ~/.minecraft/versions/1.21.10/1.21.10.jar item_icons enchantments

# Using custom directories
python scripts/extract_icons.py path/to/minecraft.jar custom_icons custom_enchantments
```

**Parameters:**
- `jar_file` (required): Path to the Minecraft JAR file
- `output_dir` (optional): Directory for extracted icons (default: `item_icons`)
- `enchantments_dir` (optional): Directory containing enchantments JSON (default: `enchantments`)

**Output:**
- Extracts PNG files for all enchantable items
- Shows progress and statistics
- Only extracts icons for items mentioned in the enchantments JSON

### Finding Your Minecraft JAR

The Minecraft JAR file is typically located at:

**Windows:**
```
%APPDATA%\.minecraft\versions\<version>\<version>.jar
```

**macOS:**
```
~/Library/Application Support/minecraft/versions/<version>/<version>.jar
```

**Linux:**
```
~/.minecraft/versions/<version>/<version>.jar
```

## Project Structure

```
mc_book_tracker/
├── index.html              # Main web app
├── styles.css              # Styling
├── script.js               # Application logic
├── README.md              # This file
├── scripts/
│   ├── extract_enchantments.py  # Extract enchantment data
│   └── extract_icons.py         # Extract item icons
├── enchantments/
│   └── enchantments_1.21.10.json  # Enchantment data
└── item_icons/
    └── *.png              # Item texture files
```

## Complete Setup Example

Here's a complete workflow from start to finish:

```bash
# 1. Extract enchantment data
python scripts/extract_enchantments.py \
  ~/.minecraft/versions/1.21.10/1.21.10.jar \
  enchantments/enchantments_1.21.10.json

# 2. Extract item icons (uses the enchantments JSON from step 1)
python scripts/extract_icons.py \
  ~/.minecraft/versions/1.21.10/1.21.10.jar \
  item_icons \
  enchantments

# 3. Open index.html in your browser
# The app will automatically load the extracted data!
```

## Development

### File Organization

The project uses separate files for better code organization:
- **HTML**: Structure and content
- **CSS**: All styling (external file for better caching and linting)
- **JavaScript**: Application logic (external file for better code editing)

### Making Changes

1. Edit `styles.css` for styling changes
2. Edit `script.js` for functionality changes
3. Edit `index.html` for structure changes

The browser will cache the CSS and JavaScript files, so you may need to do a hard refresh (Ctrl+F5 or Cmd+Shift+R) to see changes.

## Disclaimer

**NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

This is a fan-made tool for personal use. All Minecraft assets (textures, icons, game data) are property of Mojang AB and Microsoft Corporation.

This tool is provided for personal, non-commercial use only. Users extract assets from their own legally obtained copy of Minecraft. See the [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) for more information about acceptable use of Minecraft assets.

## License

The code for this tracker is provided as-is for personal use. Minecraft assets remain the property of Mojang AB and Microsoft Corporation.

## Troubleshooting

### "File not found" error
- Make sure the JAR file path is correct
- Check that you have read permissions for the file

### "No enchantable items found" error
- Run `extract_enchantments.py` first before `extract_icons.py`
- Make sure the enchantments JSON file exists in the specified directory

### Icons not showing in web app
- Verify that the `item_icons/` directory contains PNG files
- Check browser console for 404 errors
- Make sure the file paths in your enchantments JSON match the extracted icon filenames

### Web app not loading data
- Check browser console (F12) for errors
- Ensure `enchantments/enchantments_1.21.10.json` exists
- Try manually loading the JSON file using the "Load Enchantments JSON" button

## Contributing

This is a personal project, but suggestions and improvements are welcome! Feel free to fork and customize for your own use.
