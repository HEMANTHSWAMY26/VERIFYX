#!/usr/bin/env python3
"""
VERIFYX Phase 8.7 — Real-World Visual Evaluation Script
-------------------------------------------------------
Runs inference with verifyx_yolo11n_baseline_10ep.pt on genuinely held-out
test images across all 5 classes and negative corridor scenes.
Generates prediction visualizations at conf=0.25 and conf=0.50 into
runs/verifyx_baseline_visual/conf_25/ and runs/verifyx_baseline_visual/conf_50/.
Produces detailed detection logs and failure mode audit.
"""

import os
import shutil
import zipfile
import json
from pathlib import Path
from PIL import Image

CLASSES = {
    0: "fire_extinguisher",
    1: "emergency_exit_sign",
    2: "hazard_sign",
    3: "box_carton",
    4: "chair_furniture"
}

def setup_test_pool(test_pool_dir: Path):
    test_pool_dir.mkdir(parents=True, exist_ok=True)
    # Clear existing
    for f in test_pool_dir.glob("*.*"):
        f.unlink()

    prev_scratch = Path(r"C:\Users\heman\.gemini\antigravity-ide\brain\9e4f3bbb-9748-4a07-81e0-e01ebddadadc\scratch")
    indoor_zip = Path("data/indoor_dataset/Indoor Objects.v1i.voc.zip")

    selected_files = []

    # 1. Fire Extinguishers from Indoor Objects test/ (8 images with varied conditions)
    print("Selecting held-out fire extinguisher test scenes...")
    with zipfile.ZipFile(indoor_zip, 'r') as z:
        test_fe = [f for f in z.namelist() if f.startswith('test/') and f.endswith('.jpg')]
        # Select 8 diverse test frames
        # e.g. picking every 5th or distinct ones
        fe_selection = test_fe[::6][:8]
        for idx, zf in enumerate(fe_selection):
            dst = test_pool_dir / f"test_c0_fe_{idx:02d}_{Path(zf).stem[:25]}.jpg"
            with open(dst, 'wb') as out_f:
                out_f.write(z.read(zf))
            selected_files.append((dst, 0, "fire_extinguisher", f"Held-out test split from Mendeley: {zf}"))

    # 2. Exit Signs from ExitSigns/test/images (8 images)
    print("Selecting held-out emergency exit sign test scenes...")
    exit_imgs = list((prev_scratch / "smart_campus/datasets_raw/ExitSigns/test/images").glob("*.jpg")) + \
                list((prev_scratch / "smart_campus/datasets_raw/ExitSigns/test/images").glob("*.jpeg"))
    for idx, p in enumerate(exit_imgs[::9][:8]):
        dst = test_pool_dir / f"test_c1_exit_{idx:02d}_{p.stem[:25]}.jpg"
        shutil.copy2(p, dst)
        selected_files.append((dst, 1, "emergency_exit_sign", f"Held-out test split from ExitSigns: {p.name}"))

    # 3. Hazard Signs from WetFloor/test/images (8 images)
    print("Selecting held-out hazard sign test scenes...")
    wet_imgs = list((prev_scratch / "smart_campus/datasets_raw/WetFloor/test/images").glob("*.jpg")) + \
               list((prev_scratch / "smart_campus/datasets_raw/WetFloor/test/images").glob("*.jpeg"))
    for idx, p in enumerate(wet_imgs[::16][:8]):
        dst = test_pool_dir / f"test_c2_hazard_{idx:02d}_{p.stem[:25]}.jpg"
        shutil.copy2(p, dst)
        selected_files.append((dst, 2, "hazard_sign", f"Held-out test split from WetFloor: {p.name}"))

    # 4. Box Cartons from uningested package_seg (8 images)
    print("Selecting held-out box carton test scenes...")
    existing_stems = {p.stem for p in Path("data/images").rglob("*.*")}
    pkg_candidates = [p for p in (prev_scratch / "package_seg").rglob("*.jpg") if not any(p.stem in s for s in existing_stems)]
    for idx, p in enumerate(pkg_candidates[::200][:8]):
        dst = test_pool_dir / f"test_c3_box_{idx:02d}_{p.stem[:25]}.jpg"
        shutil.copy2(p, dst)
        selected_files.append((dst, 3, "box_carton", f"Held-out uningested from Package-Seg: {p.name}"))

    # 5. Chairs from uningested homeobjects_3k (8 images)
    print("Selecting held-out chair furniture test scenes...")
    home_candidates = [p for p in (prev_scratch / "homeobjects_3k").rglob("*.jpg") if not any(p.stem in s for s in existing_stems)]
    for idx, p in enumerate(home_candidates[::250][:8]):
        dst = test_pool_dir / f"test_c4_chair_{idx:02d}_{p.stem[:25]}.jpg"
        shutil.copy2(p, dst)
        selected_files.append((dst, 4, "chair_furniture", f"Held-out uningested from HomeObjects-3K: {p.name}"))

    # 6. Negative Corridor Scenes (4 clean hallway/floor scenes)
    print("Selecting held-out negative corridor scenes...")
    neg_imgs = list(Path("data/images/val").glob("vx_neg_*.*"))
    for idx, p in enumerate(neg_imgs[:4]):
        dst = test_pool_dir / f"test_cneg_{idx:02d}_{p.stem}.jpg"
        shutil.copy2(p, dst)
        selected_files.append((dst, -1, "negative_corridor", "Clean hallway floor without safety objects"))

    print(f"\nTotal test evaluation pool assembled: {len(selected_files)} images.")
    return selected_files

def run_visual_evaluation():
    from ultralytics import YOLO

    model_path = Path("models/weights/verifyx_yolo11n_baseline_10ep.pt").resolve()
    if not model_path.exists():
        print(f"Error: Model weights not found at {model_path}")
        return

    test_pool_dir = Path("data/test_evaluation_pool").resolve()
    selected_files = setup_test_pool(test_pool_dir)

    output_base = Path("runs/verifyx_baseline_visual").resolve()
    dir_conf25 = output_base / "conf_25"
    dir_conf50 = output_base / "conf_50"

    for d in [dir_conf25, dir_conf50]:
        d.mkdir(parents=True, exist_ok=True)
        for f in d.glob("*.*"):
            f.unlink()

    print("\n==================================================")
    print("   RUNNING INFERENCE ON HELD-OUT TEST POOL        ")
    print("==================================================")
    print(f"Model: {model_path}")
    print(f"Test Pool Size: {len(selected_files)} images")
    print("--------------------------------------------------")

    model = YOLO(str(model_path))

    evaluation_records = []

    # Run inference for conf=0.25 and conf=0.50
    for img_path, target_cid, target_name, note in selected_files:
        # 1. Predict at conf=0.25
        res25 = model.predict(source=str(img_path), conf=0.25, imgsz=640, device="0", verbose=False)[0]
        # Save visualization to conf_25
        annotated_25 = res25.plot() # ndarray BGR
        im25 = Image.fromarray(annotated_25[..., ::-1]) # RGB
        im25.save(dir_conf25 / img_path.name)

        # 2. Predict at conf=0.50
        res50 = model.predict(source=str(img_path), conf=0.50, imgsz=640, device="0", verbose=False)[0]
        annotated_50 = res50.plot()
        im50 = Image.fromarray(annotated_50[..., ::-1])
        im50.save(dir_conf50 / img_path.name)

        preds25 = []
        for b in res25.boxes:
            cid = int(b.cls[0].item())
            conf = float(b.conf[0].item())
            xyxy = [round(v, 1) for v in b.xyxy[0].tolist()]
            preds25.append({"class_id": cid, "class_name": CLASSES.get(cid, "unknown"), "confidence": conf, "bbox": xyxy})

        preds50 = []
        for b in res50.boxes:
            cid = int(b.cls[0].item())
            conf = float(b.conf[0].item())
            xyxy = [round(v, 1) for v in b.xyxy[0].tolist()]
            preds50.append({"class_id": cid, "class_name": CLASSES.get(cid, "unknown"), "confidence": conf, "bbox": xyxy})

        record = {
            "image": img_path.name,
            "target_class_id": target_cid,
            "target_class_name": target_name,
            "note": note,
            "predictions_conf25": preds25,
            "predictions_conf50": preds50
        }
        evaluation_records.append(record)

    # Save summary JSON
    json_path = output_base / "visual_evaluation_results.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(evaluation_records, f, indent=2)
    print(f"\nDetailed evaluation results saved to {json_path}")
    print(f"Visual predictions saved to:\n  - {dir_conf25}\n  - {dir_conf50}")

    # Print summary table
    print("\n==================================================")
    print("VISUAL EVALUATION SUMMARY TABLE")
    print("==================================================")
    print(f"{'Image Name':<32} {'Target Class':<22} {'Conf=0.25 Preds':<20} {'Conf=0.50 Preds':<20}")
    print("-" * 96)
    for rec in evaluation_records:
        c25_str = ", ".join([f"{p['class_name']} ({p['confidence']:.2f})" for p in rec['predictions_conf25']]) or "NONE"
        c50_str = ", ".join([f"{p['class_name']} ({p['confidence']:.2f})" for p in rec['predictions_conf50']]) or "NONE"
        if len(c25_str) > 18:
            c25_str = c25_str[:16] + ".."
        if len(c50_str) > 18:
            c50_str = c50_str[:16] + ".."
        print(f"{rec['image'][:30]:<32} {rec['target_class_name']:<22} {c25_str:<20} {c50_str:<20}")

if __name__ == "__main__":
    run_visual_evaluation()
