#!/usr/bin/env python3
"""
VERIFYX YOLO11n Training Pipeline
---------------------------------
Configurable training script for custom safety object detection.
Target architecture: Ultralytics YOLO11n (Nano class)
Optimized for: Edge deployment, low latency, RTX 4060 laptop training.
"""

import os
import sys
import argparse
from pathlib import Path

def train_model(args):
    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("[ERROR] 'ultralytics' or 'torch' is not installed in the active environment.")
        print("Install via: pip install ultralytics torch torchvision")
        sys.exit(1)

    print("==================================================")
    print("        VERIFYX YOLO11n TRAINING PIPELINE         ")
    print("==================================================")
    
    data_path = Path(args.data).resolve()
    if not data_path.exists():
        print(f"[ERROR] Dataset configuration not found at {data_path}")
        sys.exit(1)

    # Determine compute device
    device = args.device
    if device is None:
        device = "0" if torch.cuda.is_available() else "cpu"
    
    print(f"Dataset Config:     {data_path}")
    print(f"Base Weights:       {args.weights}")
    print(f"Image Size:         {args.imgsz}")
    print(f"Epochs:             {args.epochs}")
    print(f"Batch Size:         {args.batch}")
    print(f"Device:             {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() and device != 'cpu' else 'CPU'})")
    print(f"Output Project:     {args.project}")
    print(f"Experiment Name:    {args.name}")
    print("--------------------------------------------------")

    if args.dry_run:
        print("[DRY-RUN] Pre-flight checks passed. Training not started (--dry-run specified).")
        return

    print("[INFO] Initializing YOLO11n architecture...")
    model = YOLO(args.weights)

    print(f"[INFO] Launching training run on {device}...")
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        project=args.project,
        name=args.name,
        workers=args.workers,
        pretrained=True,
        save=True,
        plots=True,
        val=True
    )

    print("--------------------------------------------------")
    print("[SUCCESS] Training completed.")
    print(f"Best model weights saved to: {Path(args.project) / args.name / 'weights' / 'best.pt'}")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLO11n model for VERIFYX safety verification")
    parser.add_argument("--data", type=str, default="data/dataset.yaml", help="Path to dataset.yaml")
    parser.add_argument("--weights", type=str, default="yolo11n.pt", help="Pretrained weights or base checkpoint")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Training batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension (pixels)")
    parser.add_argument("--device", type=str, default=None, help="Device to use ('0', 'cpu', etc.)")
    parser.add_argument("--workers", type=int, default=4, help="Data loader worker count")
    parser.add_argument("--project", type=str, default="models/runs", help="Destination folder for training outputs")
    parser.add_argument("--name", type=str, default="verifyx_yolo11n_safety", help="Experiment name")
    parser.add_argument("--dry-run", action="store_true", help="Perform pre-flight configuration validation without training")
    
    args = parser.parse_args()
    train_model(args)
