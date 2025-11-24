#!/usr/bin/env python3
"""
Extract enchantment data from Minecraft JAR files.

Usage: python extract_enchantments.py <jar_file> [output_file]
"""

import json
import sys
import zipfile
from pathlib import Path
from typing import Dict, List, Any


def extract_json_from_jar(jar_path: str, file_path: str) -> Dict[str, Any]:
    """Extract and parse a JSON file from the JAR."""
    try:
        with zipfile.ZipFile(jar_path, 'r') as jar:
            with jar.open(file_path) as f:
                return json.load(f)
    except (KeyError, json.JSONDecodeError):
        return {}


def get_all_enchantments(jar_path: str) -> List[str]:
    """Get list of all enchantment files in the JAR."""
    enchantments = []
    with zipfile.ZipFile(jar_path, 'r') as jar:
        for name in jar.namelist():
            if name.startswith('data/minecraft/enchantment/') and name.endswith('.json'):
                enchant_name = name.split('/')[-1].replace('.json', '')
                enchantments.append(enchant_name)
    return sorted(enchantments)


def resolve_item_tag(jar_path: str, tag: str) -> List[str]:
    """Resolve an item tag to actual items."""
    if not tag.startswith('#'):
        return [tag]

    # Remove the # and parse namespace:path
    tag = tag[1:]
    if ':' in tag:
        namespace, path = tag.split(':', 1)
    else:
        namespace, path = 'minecraft', tag

    tag_path = f'data/{namespace}/tags/item/{path}.json'
    tag_data = extract_json_from_jar(jar_path, tag_path)

    if not tag_data:
        return [f"#{tag}"]

    items = []
    for value in tag_data.get('values', []):
        if isinstance(value, str):
            if value.startswith('#'):
                # Recursive tag resolution
                items.extend(resolve_item_tag(jar_path, value))
            else:
                items.append(value)
        elif isinstance(value, dict):
            # Handle objects with 'id' field
            item_id = value.get('id', '')
            if item_id.startswith('#'):
                items.extend(resolve_item_tag(jar_path, item_id))
            else:
                items.append(item_id)

    return items


def resolve_enchantment_tag(jar_path: str, tag: str) -> List[str]:
    """Resolve an enchantment tag to actual enchantments."""
    if not tag.startswith('#'):
        return [tag]

    # Remove the # and parse namespace:path
    tag = tag[1:]
    if ':' in tag:
        namespace, path = tag.split(':', 1)
    else:
        namespace, path = 'minecraft', tag

    tag_path = f'data/{namespace}/tags/enchantment/{path}.json'
    tag_data = extract_json_from_jar(jar_path, tag_path)

    if not tag_data:
        return [f"#{tag}"]

    enchantments = []
    for value in tag_data.get('values', []):
        if isinstance(value, str):
            if value.startswith('#'):
                # Recursive tag resolution
                enchantments.extend(resolve_enchantment_tag(jar_path, value))
            else:
                enchantments.append(value)

    return enchantments


def check_enchantment_in_tag(jar_path: str, enchantment_id: str, tag_path: str) -> bool:
    """Check if an enchantment is in a tag (resolving nested tags)."""
    tag_data = extract_json_from_jar(jar_path, tag_path)
    if not tag_data:
        return False

    target = f'minecraft:{enchantment_id}'
    for value in tag_data.get('values', []):
        if isinstance(value, str):
            if value.startswith('#'):
                # Resolve nested tag
                resolved = resolve_enchantment_tag(jar_path, value)
                if target in resolved:
                    return True
            elif value == target:
                return True

    return False


def get_librarian_trades(jar_path: str, enchantment_id: str) -> Dict[str, Any]:
    """Check if enchantment is available from librarian trades."""
    trade_info = {
        'available_from_librarian': False,
        'biome_trades': []
    }

    # Check trade rebalance enchantment tags
    biomes = ['desert', 'jungle', 'plains', 'savanna', 'snow', 'swamp', 'taiga']

    for biome in biomes:
        for trade_type in ['common', 'special']:
            tag_path = f'data/minecraft/datapacks/trade_rebalance/data/minecraft/tags/enchantment/trades/{biome}_{trade_type}.json'
            if check_enchantment_in_tag(jar_path, enchantment_id, tag_path):
                trade_info['available_from_librarian'] = True
                trade_info['biome_trades'].append({
                    'biome': biome,
                    'rarity': trade_type
                })

    # Check general tradeable tag
    tradeable_path = 'data/minecraft/tags/enchantment/tradeable.json'
    if check_enchantment_in_tag(jar_path, enchantment_id, tradeable_path):
        if not trade_info['available_from_librarian']:
            trade_info['available_from_librarian'] = True
            trade_info['biome_trades'].append({
                'biome': 'any',
                'rarity': 'general'
            })

    return trade_info


def check_enchantment_tags(jar_path: str, enchantment_id: str) -> Dict[str, bool]:
    """Check which special tags the enchantment belongs to."""
    tags = {}

    tag_checks = {
        'treasure': 'data/minecraft/tags/enchantment/treasure.json',
        'curse': 'data/minecraft/tags/enchantment/curse.json',
        'in_enchanting_table': 'data/minecraft/tags/enchantment/in_enchanting_table.json',
        'on_random_loot': 'data/minecraft/tags/enchantment/on_random_loot.json',
        'on_traded_equipment': 'data/minecraft/tags/enchantment/on_traded_equipment.json',
        'on_mob_spawn_equipment': 'data/minecraft/tags/enchantment/on_mob_spawn_equipment.json',
        'double_trade_price': 'data/minecraft/tags/enchantment/double_trade_price.json'
    }

    for tag_name, tag_path in tag_checks.items():
        tag_data = extract_json_from_jar(jar_path, tag_path)
        tags[tag_name] = f'minecraft:{enchantment_id}' in tag_data.get('values', [])

    return tags


def load_language_file(jar_path: str, lang: str = 'en_us') -> Dict[str, str]:
    """Load language file from JAR."""
    lang_path = f'assets/minecraft/lang/{lang}.json'
    return extract_json_from_jar(jar_path, lang_path)


def resolve_translation(translation_data: Dict[str, Any], lang_data: Dict[str, str]) -> str:
    """Resolve a translation object to English text."""
    if isinstance(translation_data, str):
        return translation_data

    if isinstance(translation_data, dict):
        translate_key = translation_data.get('translate', '')
        if translate_key and translate_key in lang_data:
            return lang_data[translate_key]
        return translate_key

    return str(translation_data)


def parse_cost(cost_data: Dict[str, Any]) -> str:
    """Parse cost data into readable format."""
    if not cost_data:
        return "N/A"

    base = cost_data.get('base', 0)
    per_level = cost_data.get('per_level_above_first', 0)

    if per_level == 0:
        return str(base)
    else:
        return f"{base} + {per_level} per level"


def extract_enchantment_data(jar_path: str, enchantment_name: str, lang_data: Dict[str, str]) -> Dict[str, Any]:
    """Extract detailed data for a single enchantment."""
    file_path = f'data/minecraft/enchantment/{enchantment_name}.json'
    data = extract_json_from_jar(jar_path, file_path)

    if not data:
        return {}

    # Get librarian trade info
    trade_info = get_librarian_trades(jar_path, enchantment_name)

    # Get supported items
    supported_items = data.get('supported_items', '')
    items_list = resolve_item_tag(jar_path, supported_items) if supported_items else []

    # Simplified output for webapp
    enchant_info = {
        'name': enchantment_name,
        'description': resolve_translation(data.get('description', {}), lang_data),
        'max_level': data.get('max_level', 1),
        'min_cost': data.get('min_cost', {}).get('base', 0),
        'max_cost': data.get('max_cost', {}).get('base', 0),
        'rarity_weight': data.get('weight', 0),
        'applies_to': items_list,
        'librarian_biomes': [trade['biome'] for trade in trade_info['biome_trades']] if trade_info['available_from_librarian'] else [],
        'tradeable': trade_info['available_from_librarian']
    }

    return enchant_info


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_enchantments.py <jar_file> [output_file]")
        print("Example: python extract_enchantments.py versions/1.21.10/1.21.10.jar enchantments.json")
        sys.exit(1)

    jar_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'enchantments/java_1.21.10.json'

    if not Path(jar_path).exists():
        print(f"Error: JAR file not found: {jar_path}")
        sys.exit(1)

    print(f"Extracting enchantment data from {jar_path}...")

    # Load language file
    print("Loading English language file...")
    lang_data = load_language_file(jar_path)
    if not lang_data:
        print("Warning: Could not load English language file. Descriptions will show translation keys.")

    # Get all enchantments
    enchantments = get_all_enchantments(jar_path)
    print(f"Found {len(enchantments)} enchantments")

    # Extract data for each enchantment
    enchantments_list = []

    for enchant_name in enchantments:
        print(f"  Processing: {enchant_name}")
        enchant_data = extract_enchantment_data(jar_path, enchant_name, lang_data)
        enchantments_list.append(enchant_data)

    # Write output
    with open(output_path, 'w') as f:
        json.dump(enchantments_list, f, indent=2)

    print(f"\nDone! Output written to: {output_path}")
    print(f"Total enchantments processed: {len(enchantments)}")


if __name__ == '__main__':
    main()
