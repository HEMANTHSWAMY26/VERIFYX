#!/usr/bin/env python3
"""
VERIFYX Staging & Conversion Script for Indoor Objects Dataset
--------------------------------------------------------------
Extracts and converts Pascal VOC XML annotations to YOLO format
for the approved VERIFYX MVP taxonomy:
  - Class 0: fire_extinguisher
  - Class 4: chair_furniture (co-occurring in fire extinguisher scenes)
Stages the converted files non-destructively into data/staging/indoor_objects/
"""

import os
import re
import sys
import shutil
import zipfile
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

SUPPORTED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png'}

def parse_voc_xml(xml_bytes, img_w, img_h):
    """Parses VOC XML bytes and returns normalized YOLO bounding boxes."""
    tree = ET.fromstring(xml_bytes)
    size_elem = tree.find('size')
    if size_elem is not None:
        w_val = float(size_elem.findtext('width') or img_w)
        h_val = float(size_elem.findtext('height') or img_h)
        if w_val > 0 and h_val > 0:
            img_w, img_h = w_val, h_val

    boxes = []
    for obj in tree.findall('object'):
        name = (obj.findtext('name') or '').strip().lower()
        
        target_cid = None
        if name == 'fire extinguisher':
            target_cid = 0
        elif name == 'chair':
            target_cid = 4
        else:
            # We strictly ignore bin, human, door, table, shelf
            continue

        bndbox = obj.find('bndbox')
        if bndbox is None:
            continue

        try:
            xmin = float(bndbox.findtext('xmin'))
            ymin = float(bndbox.findtext('ymin'))
            xmax = float(bndbox.findtext('xmax'))
            ymax = float(bndbox.findtext('ymax'))
        except (ValueError, TypeError):
            continue

        # Clip bounds to image limits
        xmin = max(0.0, min(img_w, xmin))
        xmax = max(0.0, min(img_w, xmax))
        ymin = max(0.0, min(img_h, ymin))
        ymax = max(0.0, min(img_h, ymax))

        box_w = xmax - xmin
        box_h = ymax - ymin
        if box_w <= 1.0 or box_h <= 1.0:
            continue

        xc = (xmin + box_w / 2.0) / img_w
        yc = (ymin + box_h / 2.0) / img_h
        nw = box_w / img_w
        nh = box_h / img_h

        # Validate normalized bounds
        if 0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < nw <= 1.0 and 0.0 < nh <= 1.0:
            boxes.append((target_cid, xc, yc, nw, nh))

    return boxes

def stage_indoor_dataset(args):
    zip_path = Path(args.source_zip).resolve()
    if not zip_path.exists():
        print(f"Error: Source zip not found at {zip_path}")
        sys.exit(1)

    staging_root = Path(args.output_dir).resolve()
    images_train_dir = staging_root / "images" / "train"
    images_val_dir = staging_root / "images" / "val"
    labels_train_dir = staging_root / "labels" / "train"
    labels_val_dir = staging_root / "labels" / "val"

    for d in [images_train_dir, images_val_dir, labels_train_dir, labels_val_dir]:
        d.mkdir(parents=True, exist_ok=True)
        if args.clean:
            for f in d.glob("*.*"):
                f.unlink()

    print("==================================================")
    print("      VERIFYX INDOOR DATASET STAGING & CONVERSION ")
    print("==================================================")
    print(f"Source Zip:   {zip_path}")
    print(f"Staging Root: {staging_root}")
    print(f"Target CID:   0 (fire_extinguisher), 4 (chair_furniture)")
    print("--------------------------------------------------")

    with zipfile.ZipFile(zip_path, 'r') as z:
        file_list = z.namelist()
        xml_files = [f for f in file_list if f.lower().endswith('.xml')]
        print(f"Discovered {len(xml_files)} total XML annotation files in archive.")

        # Identify all images containing fire extinguishers
        fe_by_split = defaultdict(list)
        for xf in xml_files:
            try:
                tree = ET.fromstring(z.read(xf))
                for obj in tree.findall('object'):
                    if obj.findtext('name') == 'fire extinguisher':
                        split = xf.split('/')[0]
                        fe_by_split[split].append(xf)
                        break
            except Exception:
                pass

        print(f"Fire extinguisher candidate scenes:")
        print(f"  Train candidates: {len(fe_by_split['train'])}")
        print(f"  Valid candidates: {len(fe_by_split['valid'])}")
        print(f"  Test candidates:  {len(fe_by_split['test'])}")

        # Validation set: Use all 91 valid images
        val_xmls = fe_by_split['valid']
        
        # Training set: Group by unique base scenes and sample 1-2 per scene
        train_by_base = defaultdict(list)
        for xf in fe_by_split['train']:
            filename = xf.split('/')[-1]
            m = re.match(r'^(.*?)_jpg\.rf\.[a-f0-9]+\.xml$', filename)
            stem = m.group(1) if m else filename
            train_by_base[stem].append(xf)

        selected_train_xmls = []
        # Take 1st sample from each base scene
        for stem, candidates in sorted(train_by_base.items()):
            selected_train_xmls.append(candidates[0])
            if len(candidates) > 1 and len(selected_train_xmls) < args.max_train:
                selected_train_xmls.append(candidates[1])

        print(f"\nSelected for Staging:")
        print(f"  Train: {len(selected_train_xmls)} images (from {len(train_by_base)} base scenes)")
        print(f"  Val:   {len(val_xmls)} images")

        staged_counts = defaultdict(int)
        instance_counts = defaultdict(int)

        for split, xml_list in [("train", selected_train_xmls), ("val", val_xmls)]:
            dest_img_dir = images_train_dir if split == "train" else images_val_dir
            dest_lbl_dir = labels_train_dir if split == "train" else labels_val_dir

            for xf in xml_list:
                img_f = xf[:-4] + '.jpg'
                if img_f not in z.namelist():
                    continue

                xml_data = z.read(xf)
                img_data = z.read(img_f)

                boxes = parse_voc_xml(xml_data, 640.0, 640.0)
                if not any(b[0] == 0 for b in boxes):
                    # Ensure fire extinguisher is present
                    continue

                stem = Path(img_f).stem
                dest_img = dest_img_dir / f"mendeley_{stem}.jpg"
                dest_lbl = dest_lbl_dir / f"mendeley_{stem}.txt"

                with open(dest_img, 'wb') as f:
                    f.write(img_data)

                with open(dest_lbl, 'w', encoding='utf-8') as f:
                    for cid, xc, yc, nw, nh in boxes:
                        f.write(f"{cid} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}\n")
                        instance_counts[cid] += 1

                staged_counts[split] += 1

    print("\n--------------------------------------------------")
    print("STAGING SUMMARY")
    print("--------------------------------------------------")
    print(f"Staged Train Images: {staged_counts['train']}")
    print(f"Staged Val Images:   {staged_counts['val']}")
    print(f"Total Staged Images: {staged_counts['train'] + staged_counts['val']}")
    print("\nStaged Instances:")
    print(f"  Class 0 (fire_extinguisher): {instance_counts[0]}")
    print(f"  Class 4 (chair_furniture):   {instance_counts[4]}")
    print("--------------------------------------------------")

    # Generate staging dataset.yaml for standalone validation
    yaml_content = f"""# VERIFYX Staged Indoor Objects Dataset Manifest
path: {staging_root.as_posix()}
train: images/train
val: images/val

nc: 5

names:
  0: fire_extinguisher
  1: emergency_exit_sign
  2: hazard_sign
  3: box_carton
  4: chair_furniture
"""
    yaml_path = staging_root / "dataset.yaml"
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(yaml_content)
    print(f"Staging dataset.yaml written to {yaml_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stage & Convert Indoor Objects Dataset")
    parser.add_argument("--source-zip", default=r"data\indoor_dataset\Indoor Objects.v1i.voc.zip")
    parser.add_argument("--output-dir", default=r"data\staging\indoor_objects")
    parser.add_argument("--max-train", type=int, default=350, help="Target max train images")
    parser.add_argument("--clean", action="store_true", default=True, help="Clean destination directory before staging")
    args = parser.parse_args()

    stage_indoor_dataset(args)
