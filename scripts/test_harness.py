#!/usr/bin/env python3
"""
VERIFYX Model Offline Test Harness
----------------------------------
Standardized verification test harness:
Input Image -> Custom YOLO Model -> Detections -> Normalized VERIFYX Detection Entities -> Confidence Policy

Enforces strictly:
- No synthetic / fake detection injection.
- Truthful reporting of model detections and confidence tiers.
- Format compatibility with VERIFYX web & mobile rule engine.
"""

import os
import sys
import argparse
import json
from pathlib import Path
from PIL import Image

CLASS_DEFINITIONS = {
    0: {
        "raw_label": "fire_extinguisher",
        "friendly_label": "Fire Extinguisher",
        "category": "Fire Safety Equipment",
        "is_issue": False
    },
    1: {
        "raw_label": "emergency_exit_sign",
        "friendly_label": "Emergency Exit Sign",
        "category": "Egress & Signage",
        "is_issue": False
    },
    2: {
        "raw_label": "hazard_sign",
        "friendly_label": "Safety Hazard Sign",
        "category": "Hazard & Warning Signs",
        "is_issue": False
    },
    3: {
        "raw_label": "obstruction_item",
        "friendly_label": "Pathway Obstruction Item",
        "category": "Corridor Egress & Obstacle",
        "is_issue": True
    }
}

CONFIDENCE_THRESHOLDS = {
    "HIGH": 0.70,
    "MEDIUM": 0.45
}

def evaluate_confidence_decision(confidence: float, is_issue: bool):
    if confidence >= CONFIDENCE_THRESHOLDS["HIGH"]:
        return {
            "tier": "HIGH",
            "decision": "ISSUE" if is_issue else "PASS",
            "explanation": "Confirmed detection with high model confidence."
        }
    elif confidence >= CONFIDENCE_THRESHOLDS["MEDIUM"]:
        return {
            "tier": "MEDIUM",
            "decision": "REVIEW_REQUIRED",
            "explanation": "Uncertain detection; verification requires human inspector review."
        }
    else:
        return {
            "tier": "LOW",
            "decision": "RESCAN_NEEDED",
            "explanation": "Confidence is below reliable threshold. Re-scan required."
        }

def run_test_harness(image_path: str, model_path: str, conf_thresh: float = 0.25):
    img_file = Path(image_path).resolve()
    if not img_file.exists():
        print(f"[ERROR] Image file not found: {img_file}")
        return

    print("==================================================")
    print("           VERIFYX MODEL TEST HARNESS             ")
    print("==================================================")
    print(f"Target Image:       {img_file}")
    print(f"Model Weights:      {model_path}")
    print(f"Confidence Filter:  {conf_thresh}")
    print("--------------------------------------------------")

    # Check image dimensions
    with Image.open(img_file) as pil_img:
        width, height = pil_img.size

    print(f"Image Resolution:   {width}x{height}")

    # Load Model
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
    except Exception as e:
        print(f"[ERROR] Failed to load model weights: {e}")
        return

    # Execute Inference
    results = model.predict(source=str(img_file), conf=conf_thresh, verbose=False)
    
    if len(results) == 0 or len(results[0].boxes) == 0:
        print("\n[RESULT] NO DETECTIONS")
        print("Model did not identify any of the 4 safety classes above threshold.")
        print("VERIFYX Decision: NO_DETECTION (Truthful zero detection)")
        print("==================================================")
        return

    boxes = results[0].boxes
    detections = []

    print(f"\nModel Detections Found: {len(boxes)}")
    print("--------------------------------------------------")

    for idx, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        # box.xyxy in absolute pixels [x1, y1, x2, y2]
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        # Normalized coordinates [0..1]
        norm_x = max(0.0, min(1.0, x1 / width))
        norm_y = max(0.0, min(1.0, y1 / height))
        norm_w = max(0.0, min(1.0, (x2 - x1) / width))
        norm_h = max(0.0, min(1.0, (y2 - y1) / height))

        class_info = CLASS_DEFINITIONS.get(cls_id, {
            "raw_label": f"unknown_class_{cls_id}",
            "friendly_label": f"Unknown Class {cls_id}",
            "category": "Unknown",
            "is_issue": False
        })

        conf_eval = evaluate_confidence_decision(conf, class_info["is_issue"])

        standard_detection = {
            "id": f"det-{idx+1}",
            "raw_class_id": cls_id,
            "raw_label": class_info["raw_label"],
            "friendly_label": class_info["friendly_label"],
            "category": class_info["category"],
            "confidence": round(conf, 4),
            "confidence_tier": conf_eval["tier"],
            "decision": conf_eval["decision"],
            "explanation": conf_eval["explanation"],
            "bounding_box": {
                "x": round(norm_x, 4),
                "y": round(norm_y, 4),
                "width": round(norm_w, 4),
                "height": round(norm_h, 4)
            }
        }
        detections.append(standard_detection)

        print(f"[{idx+1}] {class_info['friendly_label']} ({class_info['raw_label']})")
        print(f"    Confidence:     {standard_detection['confidence']*100:.1f}% ({conf_eval['tier']})")
        print(f"    Decision:       {conf_eval['decision']}")
        print(f"    Bounding Box:   x={standard_detection['bounding_box']['x']}, y={standard_detection['bounding_box']['y']}, w={standard_detection['bounding_box']['width']}, h={standard_detection['bounding_box']['height']}")
        print(f"    Explanation:    {conf_eval['explanation']}")
        print()

    print("--------------------------------------------------")
    print("CANONICAL VERIFYX PAYLOAD (JSON):")
    print(json.dumps({"detections": detections}, indent=2))
    print("==================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test harness for VERIFYX custom safety model")
    parser.add_argument("--image", required=True, help="Path to input test image")
    parser.add_argument("--model", default="yolo11n.pt", help="Path to model weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")

    args = parser.parse_args()
    run_test_harness(args.image, args.model, args.conf)
