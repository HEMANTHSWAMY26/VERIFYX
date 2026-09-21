# VERIFYX Safety Dataset Architecture & Guidelines

## 1. Directory Organization

The VERIFYX offline dataset is partitioned following the standard YOLO format:

```
data/
├── dataset.yaml        # YOLO dataset descriptor with class IDs & splits
├── images/             # Raw input images
│   ├── train/          # Training split
│   └── val/            # Validation split
└── labels/             # YOLO ground-truth annotations (.txt)
    ├── train/          # Normalized bounding boxes for training
    └── val/            # Normalized bounding boxes for validation
```

## 2. Target Classes & Ground Truth Protocol

| Class ID | Class Name | Description | Sourcing / Ground Truth Rules |
|:---|:---|:---|:---|
| `0` | `fire_extinguisher` | Commercial / industrial wall-mounted or floor-standing fire extinguishers. | Awaiting on-site smartphone calibration capture (public licensing gap). |
| `1` | `emergency_exit_sign` | Illuminated or static green/white emergency exit signs and directional arrows. | ISO 7010 compliant exit signs (ExitSigns, CC BY 4.0). |
| `2` | `hazard_sign` | Triangular caution, flammable, high-voltage, wet floor warning signs. | Yellow hazard placards and folding signs (WetFloor, CC BY 4.0). |
| `3` | `box_carton` | Cardboard delivery boxes, cartons, and packaging containers. | Open logistics packaging assets (Package-Seg, AGPL-3.0). |
| `4` | `chair_furniture` | Office chairs, stools, and movable task seating. | Indoor benchmark furniture assets (HomeObjects-3K, AGPL-3.0). |
| `5` | `cart_trolley` | Janitorial carts, utility trolleys, and hand trucks. | Awaiting on-site smartphone calibration capture (public licensing gap). |
| `6` | `pallet` | Wooden or composite industrial logistics pallets resting on floor. | Logistics pallet detection assets (Pallet-ZSFNN, CC BY 4.0). |
| `7` | `large_bin` | Industrial waste containers, wheeled trash bins, and large receptacles. | Awaiting on-site smartphone calibration capture (public licensing gap). |

> **IMPORTANT**: **CLEAR PATHWAY is NOT an object class**. It is an evaluated spatial condition computed by combining:
> 1. Detections of concrete floor obstruction objects (`box_carton`, `chair_furniture`, `cart_trolley`, `pallet`, `large_bin`)
> 2. Spatial bounding-box ground contact (bottom-edge ground coordinates: $P_{\text{ground}} = (x_c, y_c + h/2)$)
> 3. Geometric pathway boundary rule (corridor floor polygon test)

## 3. YOLO Label Format Specification

Each text file corresponding to an image `image_name.jpg` must have the exact filename `image_name.txt` under `labels/`:
```
<class_id> <x_center> <y_center> <width> <height>
```
Where all values are floating-point numbers normalized to `[0.0, 1.0]`:
- `0 <= class_id <= 7` (strictly integer)
- `0.0 <= x_center <= 1.0`
- `0.0 <= y_center <= 1.0`
- `0.0 < width <= 1.0`
- `0.0 < height <= 1.0`

## 4. Integrity & Data Quality Gates

Prior to any training invocation, the dataset must pass `scripts/validate_dataset.py` with zero errors:
- No orphaned images (image with missing label file).
- No orphaned labels (label with missing image file).
- No unnormalized or out-of-range coordinates.
- No corrupted or unreadable image headers.
- Verified class distribution and documentation of any imbalance.
