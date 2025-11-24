#!/usr/bin/env python3
"""
Extract item icons from Minecraft JAR files.

Usage: python extract_icons.py <jar_file> [output_dir] [enchantments_dir]
"""

import sys
import json
import zipfile
from pathlib import Path


def load_enchantable_items(enchantments_dir: str = 'enchantments') -> set[str]:
    """Load all enchantable items from JSON files in the enchantments directory."""
    enchantments_path = Path(enchantments_dir)

    if not enchantments_path.exists():
        print(f"Warning: Enchantments directory not found: {enchantments_dir}")
        return set()

    all_items = set()
    json_files = list(enchantments_path.glob('*.json'))

    print(f"Loading enchantable items from {len(json_files)} JSON file(s)...")

    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                enchantments = json.load(f)

            for enchantment in enchantments:
                # Get all items this enchantment applies to
                applies_to = enchantment.get('applies_to', [])
                for item in applies_to:
                    # Remove the 'minecraft:' prefix
                    if item.startswith('minecraft:'):
                        item_name = item[len('minecraft:'):]
                        all_items.add(item_name)
                    else:
                        all_items.add(item)

        except Exception as e:
            print(f"  Warning: Failed to load {json_file.name}: {e}")

    print(f"Found {len(all_items)} unique enchantable items")
    return all_items


def extract_item_icons(jar_path: str, output_dir: str = 'item_icons',
                       enchantments_dir: str = 'enchantments'):
    """Extract item texture icons from the JAR file for enchantable items only."""

    jar_file = Path(jar_path)
    if not jar_file.exists():
        print(f"Error: JAR file not found: {jar_path}")
        sys.exit(1)

    # Load the list of enchantable items
    enchantable_items = load_enchantable_items(enchantments_dir)

    if not enchantable_items:
        print("Error: No enchantable items found. Cannot proceed.")
        sys.exit(1)

    # Add essential fallback icons that are used in the UI
    # Note: Mob heads don't have item textures in Minecraft - they're rendered dynamically
    fallback_icons = {
        'barrier',
        'book'
    }
    enchantable_items.update(fallback_icons)

    # Special case items that have state-specific or entity textures
    # Map item name to actual texture filename
    special_item_textures = {
        'crossbow': 'crossbow_standby',  # Crossbow has state-specific textures
        'compass': 'compass_00',  # Compass has animated textures
        'clock': 'clock_00',  # Clock has animated textures (if enchantable)
        'bow': 'bow',  # Bow has pulling state textures, but bow.png should exist
    }

    print(f"Added {len(fallback_icons)} fallback icons: {', '.join(sorted(fallback_icons))}")

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    print(f"\nExtracting item icons from {jar_path}...")
    print(f"Output directory: {output_path.absolute()}")

    extracted_count = 0
    skipped_count = 0

    with zipfile.ZipFile(jar_path, 'r') as jar:
        # Get all files in the item textures directory
        item_files = [
            name for name in jar.namelist()
            if name.startswith('assets/minecraft/textures/item/')
            and name.endswith('.png')
        ]

        # Also get block textures (for heads, skulls, pumpkins, etc.)
        block_files = [
            name for name in jar.namelist()
            if name.startswith('assets/minecraft/textures/block/')
            and name.endswith('.png')
        ]

        print(f"Found {len(item_files)} item texture files in JAR")
        print(f"Found {len(block_files)} block texture files in JAR")

        # Process item textures
        for file_path in item_files:
            # Extract just the filename (without .png extension)
            filename = Path(file_path).name
            item_name = filename[:-4]  # Remove .png extension

            # Only extract if this item is enchantable
            if item_name not in enchantable_items:
                skipped_count += 1
                continue

            # Extract the file
            try:
                with jar.open(file_path) as source:
                    with open(output_path / filename, 'wb') as target:
                        target.write(source.read())
                extracted_count += 1

                if extracted_count % 20 == 0:
                    print(f"  Extracted {extracted_count} icons...")

            except Exception as e:
                print(f"  Warning: Failed to extract {filename}: {e}")

        # Process block textures (for heads, skulls, pumpkins)
        for file_path in block_files:
            filename = Path(file_path).name
            item_name = filename[:-4]  # Remove .png extension

            # Only extract if this item is enchantable
            if item_name not in enchantable_items:
                skipped_count += 1
                continue

            # Extract the file (don't overwrite if already exists from item textures)
            output_file = output_path / filename
            if output_file.exists():
                continue

            try:
                with jar.open(file_path) as source:
                    with open(output_file, 'wb') as target:
                        target.write(source.read())
                extracted_count += 1

                if extracted_count % 20 == 0:
                    print(f"  Extracted {extracted_count} icons...")

            except Exception as e:
                print(f"  Warning: Failed to extract {filename}: {e}")

        # Handle special case items with state-specific textures
        for item_name, texture_name in special_item_textures.items():
            if item_name in enchantable_items:
                source_file = f'assets/minecraft/textures/item/{texture_name}.png'
                target_file = output_path / f'{texture_name}.png'

                if source_file in jar.namelist() and not target_file.exists():
                    try:
                        with jar.open(source_file) as source:
                            with open(target_file, 'wb') as target:
                                target.write(source.read())
                        extracted_count += 1
                        print(f"  Extracted special case: {texture_name}.png for {item_name}")
                    except Exception as e:
                        print(f"  Warning: Failed to extract special case {texture_name}.png: {e}")

    print(f"\nSuccessfully extracted {extracted_count} item icons to {output_path}/")
    print(f"Skipped {skipped_count} non-enchantable items")

    # Show some examples of what was extracted
    print("\nSample of extracted icons:")
    sample_files = sorted(output_path.glob('*.png'))[:10]
    for f in sample_files:
        print(f"  - {f.name}")
    if len(list(output_path.glob('*.png'))) > 10:
        print(f"  ... and {len(list(output_path.glob('*.png'))) - 10} more")


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_icons.py <jar_file> [output_dir] [enchantments_dir]")
        print("Example: python extract_icons.py versions/1.21.10/1.21.10.jar item_icons enchantments")
        sys.exit(1)

    jar_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'item_icons'
    enchantments_dir = sys.argv[3] if len(sys.argv) > 3 else 'enchantments'

    extract_item_icons(jar_path, output_dir, enchantments_dir)


if __name__ == '__main__':
    main()
