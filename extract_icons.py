#!/usr/bin/env python3
"""
Extract item icons from Minecraft JAR files.

Usage: python extract_icons.py <jar_file> [output_dir]
"""

import sys
import zipfile
from pathlib import Path


def extract_item_icons(jar_path: str, output_dir: str = 'item_icons'):
    """Extract all item texture icons from the JAR file."""

    jar_file = Path(jar_path)
    if not jar_file.exists():
        print(f"Error: JAR file not found: {jar_path}")
        sys.exit(1)

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    print(f"Extracting item icons from {jar_path}...")
    print(f"Output directory: {output_path.absolute()}")

    extracted_count = 0

    with zipfile.ZipFile(jar_path, 'r') as jar:
        # Get all files in the item textures directory
        item_files = [
            name for name in jar.namelist()
            if name.startswith('assets/minecraft/textures/item/')
            and name.endswith('.png')
        ]

        print(f"Found {len(item_files)} item texture files")

        for file_path in item_files:
            # Extract just the filename
            filename = Path(file_path).name

            # Extract the file
            try:
                with jar.open(file_path) as source:
                    with open(output_path / filename, 'wb') as target:
                        target.write(source.read())
                extracted_count += 1

                if extracted_count % 100 == 0:
                    print(f"  Extracted {extracted_count} icons...")

            except Exception as e:
                print(f"  Warning: Failed to extract {filename}: {e}")

    print(f"\nSuccessfully extracted {extracted_count} item icons to {output_path}/")

    # Show some examples of what was extracted
    print("\nSample of extracted icons:")
    sample_files = sorted(output_path.glob('*.png'))[:10]
    for f in sample_files:
        print(f"  - {f.name}")
    if len(list(output_path.glob('*.png'))) > 10:
        print(f"  ... and {len(list(output_path.glob('*.png'))) - 10} more")


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_icons.py <jar_file> [output_dir]")
        print("Example: python extract_icons.py versions/1.21.10/1.21.10.jar item_icons")
        sys.exit(1)

    jar_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'item_icons'

    extract_item_icons(jar_path, output_dir)


if __name__ == '__main__':
    main()
