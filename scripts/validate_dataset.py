#!/usr/bin/env python3
"""
VERIFYX Dataset Validation Tool
-------------------------------
Validates dataset integrity against YOLO format standards:
- Image/label pairing and directory layout
- Label syntax and token counts
- Coordinate normalization bounds [0.0, 1.0]
- Bounding box dimension validity (w > 0, h > 0)
- Image file integrity (PIL verification)
- Class ID distribution and empty label tracking
"""

import os
import sys
import argparse
import yaml
from pathlib import Path
from PIL import Image
from collections import defaultdict

SUPPORTED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

def validate_dataset(yaml_path: str) -> bool:
    yaml_file = Path(yaml_path).resolve()
    if not yaml_file.exists():
        print(f"Error: Dataset configuration file not found at {yaml_file}")
        return False

    with open(yaml_file, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    base_dir = yaml_file.parent
    if 'path' in config:
        config_path = Path(config['path'])
        if not config_path.is_absolute():
            base_dir = (yaml_file.parent / config_path).resolve()
        else:
            base_dir = config_path

    class_names = config.get('names', {})
    if isinstance(class_names, list):
        class_map = {i: name for i, name in enumerate(class_names)}
    elif isinstance(class_names, dict):
        class_map = {int(k): v for k, v in class_names.items()}
    else:
        class_map = {}

    num_classes = config.get('nc', len(class_map))

    splits = ['train', 'val']
    total_images = 0
    total_labels = 0
    missing_labels = 0
    missing_images = 0
    invalid_labels = 0
    corrupt_images = 0
    empty_labels = 0
    duplicate_stems = 0

    class_counts = defaultdict(int)
    errors = []

    print("==================================================")
    print("           VERIFYX DATASET VALIDATION             ")
    print("==================================================")
    print(f"Config: {yaml_file}")
    print(f"Resolved Data Root: {base_dir}")
    print(f"Declared Classes ({num_classes}): {class_map}")
    print("--------------------------------------------------")

    seen_stems = set()

    for split in splits:
        split_rel = config.get(split)
        if not split_rel:
            continue

        images_dir = base_dir / split_rel
        labels_dir = base_dir / split_rel.replace('images', 'labels')

        # Fallback if standard convention differed
        if not labels_dir.exists() and (base_dir / 'labels' / split).exists():
            labels_dir = base_dir / 'labels' / split

        print(f"Checking Split [{split.upper()}]:")
        print(f"  Images: {images_dir}")
        print(f"  Labels: {labels_dir}")

        if not images_dir.exists():
            print(f"  [WARNING] Images directory not found: {images_dir}")
            continue

        image_files = [p for p in images_dir.iterdir() if p.suffix.lower() in SUPPORTED_IMAGE_EXTS]
        label_files = list(labels_dir.iterdir()) if labels_dir.exists() else []

        split_images_count = len(image_files)
        total_images += split_images_count

        label_stems = {p.stem: p for p in label_files if p.suffix.lower() == '.txt'}

        for img_path in image_files:
            stem = img_path.stem
            if (split, stem) in seen_stems:
                duplicate_stems += 1
                errors.append(f"Duplicate image stem detected: {img_path.name}")
            seen_stems.add((split, stem))

            # 1. Check Image Corruption
            try:
                with Image.open(img_path) as img:
                    img.verify()
            except Exception as e:
                corrupt_images += 1
                errors.append(f"Corrupt image {img_path.name}: {e}")
                continue

            # 2. Check Corresponding Label
            if stem not in label_stems:
                missing_labels += 1
                errors.append(f"Missing label for image: {img_path.name}")
                continue

            lbl_path = label_stems[stem]
            total_labels += 1

            # 3. Parse Label Content
            try:
                with open(lbl_path, 'r', encoding='utf-8') as lf:
                    lines = [line.strip() for line in lf if line.strip()]

                if len(lines) == 0:
                    empty_labels += 1
                    continue

                for line_idx, line in enumerate(lines, 1):
                    tokens = line.split()
                    if len(tokens) != 5:
                        invalid_labels += 1
                        errors.append(f"{lbl_path.name}:{line_idx} - Invalid token count (expected 5, got {len(tokens)})")
                        continue

                    try:
                        cls_id = int(tokens[0])
                        x_c = float(tokens[1])
                        y_c = float(tokens[2])
                        w = float(tokens[3])
                        h = float(tokens[4])
                    except ValueError:
                        invalid_labels += 1
                        errors.append(f"{lbl_path.name}:{line_idx} - Non-numeric coordinate values")
                        continue

                    if cls_id < 0 or cls_id >= num_classes:
                        invalid_labels += 1
                        errors.append(f"{lbl_path.name}:{line_idx} - Class ID {cls_id} out of bounds [0, {num_classes-1}]")
                        continue

                    # Validate normalized coordinates [0.0, 1.0]
                    if not (0.0 <= x_c <= 1.0 and 0.0 <= y_c <= 1.0):
                        invalid_labels += 1
                        errors.append(f"{lbl_path.name}:{line_idx} - Center ({x_c}, {y_c}) outside [0, 1]")
                        continue

                    if not (0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        invalid_labels += 1
                        errors.append(f"{lbl_path.name}:{line_idx} - Dimensions ({w}, {h}) invalid")
                        continue

                    class_counts[cls_id] += 1

            except Exception as e:
                invalid_labels += 1
                errors.append(f"Error reading label {lbl_path.name}: {e}")

        # Check for orphan labels (labels with no corresponding image)
        image_stems = {p.stem for p in image_files}
        for stem, lbl_path in label_stems.items():
            if stem not in image_stems:
                missing_images += 1
                errors.append(f"Orphan label file without image: {lbl_path.name}")

    print("\n--------------------------------------------------")
    print("DATASET VALIDATION SUMMARY")
    print("--------------------------------------------------")
    print(f"Total Images:     {total_images}")
    print(f"Total Labels:     {total_labels}")
    print(f"Empty Labels:     {empty_labels}")
    print(f"Duplicate Names:  {duplicate_stems}")
    print(f"Corrupt Images:   {corrupt_images}")
    print(f"Missing Labels:   {missing_labels}")
    print(f"Orphan Labels:    {missing_images}")
    print(f"Invalid Labels:   {invalid_labels}")
    print("\nClass Distribution:")
    for cls_id in range(num_classes):
        cls_name = class_map.get(cls_id, f"class_{cls_id}")
        count = class_counts[cls_id]
        print(f"  [{cls_id}] {cls_name:<22}: {count}")

    is_pass = (
        total_images > 0
        and missing_labels == 0
        and corrupt_images == 0
        and invalid_labels == 0
        and duplicate_stems == 0
        and all(class_counts[cid] > 0 for cid in range(num_classes))
    )

    print("\n--------------------------------------------------")
    if total_images == 0:
        print("STATUS: NOT READY (Dataset empty / awaiting samples)")
    elif is_pass:
        print("STATUS: PASS")
    else:
        print("STATUS: FAIL (Issues detected or class unrepresented)")
    print("--------------------------------------------------")

    if errors:
        print("\nFirst 10 Errors/Warnings:")
        for err in errors[:10]:
            print(f"  - {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more issues.")

    return is_pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate YOLO dataset for VERIFYX")
    parser.add_argument("--config", default="data/dataset.yaml", help="Path to dataset.yaml")
    args = parser.parse_args()

    success = validate_dataset(args.config)
    sys.exit(0 if success else 1)
