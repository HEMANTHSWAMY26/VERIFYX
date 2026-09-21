# VERIFYX Phase 8.2 — Dataset Acquisition, Curation & Validation Report

**Phase:** 8.2 — Physical Dataset Curation & Quality Gatekeeping  
**Target Taxonomy:** 8 Fine-Grained Detection Classes  
**Annotation Standard:** YOLO Normalized Bounding Box Format (`<class_id> <xc> <yc> <w> <h>`)  
**Data Root:** `data/` (`images/train`, `images/val`, `labels/train`, `labels/val`)  
**Status Date:** Current Verification Baseline  

---

## 1. Sources Used

Every acquired sample originates from verified public repositories or open-access benchmarks with explicit permissive licensing:

1. **ExitSigns (`khaleds-workspace-f0mmh/exit-lights-oqpew`)**:
   - Platform: Roboflow Universe
   - Source Content: Real-world indoor illuminated and photoluminescent emergency exit signs.
   - Sourced: 250 curated images.
2. **WetFloor (`khaleds-workspace-f0mmh/wet-floor-signs-complete-ezynq-1uwnh`)**:
   - Platform: Roboflow Universe
   - Source Content: Standard high-visibility yellow folding A-frame "Caution: Wet Floor" safety placards.
   - Sourced: 250 curated images.
3. **Package-Seg (Ultralytics Logistics Asset)**:
   - Platform: Ultralytics Open Vision Assets (`package-seg.zip`)
   - Source Content: Warehouse packages, delivery boxes, and shipping cartons.
   - Sourced: 250 curated images.
4. **HomeObjects-3K (Ultralytics / HomeObjects Asset)**:
   - Platform: Ultralytics Open Benchmarks (`homeobjects-3K.zip`)
   - Source Content: Indoor office chairs, desk task seating, and dining chairs. Filtered strictly for Class ID 2 (`chair`); all non-chair classes discarded.
   - Sourced: 250 curated images.
5. **Pallet-ZSFNN (`object-detection/palet-zsfnn`)**:
   - Platform: Roboflow Universe
   - Source Content: Logistics warehouse wooden pallets resting on ground plane.
   - Sourced: 250 curated images.
6. **Corridor Negative Samples**:
   - Platform: Internal / Clean Floor Extraction
   - Source Content: Completely clear hallway floors, unobstructed walkways, and blank lower-wall thresholds.
   - Sourced: 30 negative frames (0-byte labels).

---

## 2. Licenses

Licensing compliance has been verified against commercial redistribution, training rights, and attribution mandates:

| Source Dataset | License | Commercial Permitted | Attribution Mandate | Notes / Restrictions |
|:---|:---:|:---:|:---:|:---|
| **ExitSigns** | **CC BY 4.0** | YES | YES | Attribution required: Roboflow workspace `khaleds-workspace-f0mmh`. |
| **WetFloor** | **CC BY 4.0** | YES | YES | Attribution required: Roboflow workspace `khaleds-workspace-f0mmh`. |
| **Package-Seg** | **AGPL-3.0** | YES | YES | Open logistics segmentation benchmark from Ultralytics assets. |
| **HomeObjects-3K** | **AGPL-3.0** | YES | YES | Open indoor objects benchmark from Ultralytics assets. |
| **Pallet-ZSFNN** | **CC BY 4.0** | YES | YES | Attribution required: Roboflow workspace `object-detection`. |
| **Corridor Negatives** | **Public Domain / Self** | YES | None | Verified clean hallway floors without equipment or obstructions. |

Full BibTeX citations and legal provenance records are preserved in [`data/SOURCES_AND_LICENSES.md`](file:///c:/Users/heman/OneDrive/Desktop/VERIFYX/data/SOURCES_AND_LICENSES.md).

---

## 3. Final Classes

VERIFYX utilizes an 8-class detection taxonomy focused on concrete physical objects. In accordance with the spatial rule architecture, **"Clear Pathway" is NOT a detection class**; it is evaluated dynamically by intersecting floor-contact points of detected obstruction objects (`box_carton`, `chair_furniture`, `cart_trolley`, `pallet`, `large_bin`) with the pedestrian corridor zone polygon:

| Class ID | Class Name | Category | Real-World Object Sourced |
|:---:|:---|:---|:---|
| **0** | `fire_extinguisher` | Life Safety Asset | Commercial wall-mounted or floor-boot fire extinguishers. |
| **1** | `emergency_exit_sign` | Life Safety Asset | Illuminated green/red EXIT signs and ISO 7010 running-man egress signage. |
| **2** | `hazard_sign` | Life Safety Asset | High-visibility yellow caution / wet-floor A-frame signs. |
| **3** | `box_carton` | Concrete Obstacle | Cardboard cartons, shipping boxes, delivery packages. |
| **4** | `chair_furniture` | Concrete Obstacle | Movable office chairs, task seating, stools in walkway. |
| **5** | `cart_trolley` | Concrete Obstacle | Janitorial utility carts, hand trucks, luggage trolleys. |
| **6** | `pallet` | Concrete Obstacle | Industrial wooden logistics pallets on floor. |
| **7** | `large_bin` | Concrete Obstacle | Wheeled commercial dumpsters, large waste containers. |

---

## 4. Images Per Class

Instances per class were audited from physical bounding box annotations in the curated dataset:

| Class ID | Class Name | Curated Images | Annotated Instances | Representation Status |
|:---:|:---|:---:|:---:|:---|
| **0** | `fire_extinguisher` | 0 | 0 | **GAP: Awaiting Smartphone Calibration Capture** |
| **1** | `emergency_exit_sign` | 250 | 257 | **Acquired (Public Base)** |
| **2** | `hazard_sign` | 250 | 254 | **Acquired (Public Base)** |
| **3** | `box_carton` | 250 | 953 | **Acquired (Public Base)** |
| **4** | `chair_furniture` | 250 | 545 | **Acquired (Public Base)** |
| **5** | `cart_trolley` | 0 | 0 | **GAP: Awaiting Smartphone Calibration Capture** |
| **6** | `pallet` | 250 | 403 | **Acquired (Public Base)** |
| **7** | `large_bin` | 0 | 0 | **GAP: Awaiting Smartphone Calibration Capture** |
| **—** | `negative_corridor` | 30 | 0 (0-byte labels) | **Acquired (Clean Floor Ground Truth)** |
| **TOTAL** | **All Splits** | **1,280** | **2,412** | **1,280 Paired Samples** |

*Note: Multi-object images (such as multiple boxes in a warehouse or multiple chairs in a room) account for instances exceeding total image count.*

---

## 5. Train/Validation Split

The dataset is partitioned following a stratified 80% Train / 20% Validation split with deduplication:

| Split | Images | Annotations | Percentage | Directory Path |
|:---|:---:|:---:|:---:|:---|
| **Train** | 1,024 | 1,930 | 80.0% | `data/images/train/`, `data/labels/train/` |
| **Validation** | 256 | 482 | 20.0% | `data/images/val/`, `data/labels/val/` |
| **Total** | **1,280** | **2,412** | **100.0%** | `data/` |

---

## 6. Negative Samples

To suppress false-positive activations on patterned carpets, concrete expansion joints, tile reflections, and floor seams:
- **Quantity:** 30 verified negative images (24 in `train`, 6 in `val`).
- **Format:** Standard image files (`.jpg`) paired with strictly empty 0-byte `.txt` label files.
- **Visual Content:** Empty, unobstructed corridors, clean linoleum and concrete floor surfaces, and open door thresholds.
- **Impact:** Prevents the YOLO feature extractor from developing an inductive bias that every floor view must contain an obstacle.

---

## 7. Conversion Process

The automated curation pipeline (`scripts/prepare_dataset.py`) executed the following conversions:
1. **Source Discovery:** Scanned local raw directories, filtering supported extensions (`.jpg`, `.jpeg`, `.png`).
2. **Annotation Translation:**
   - **YOLO BBox Datasets (`ExitSigns`, `WetFloor`, `Pallet`):** Remapped source class index (`0`) to canonical VERIFYX indices (`1`, `2`, `6`).
   - **Polygon Segmentation Masks (`Package-Seg`):** Converted normalized coordinate streams $[x_1, y_1, x_2, y_2, \dots, x_k, y_k]$ to minimum/maximum bounding extents $[x_{\min}, x_{\max}, y_{\min}, y_{\max}]$, and computed normalized center coordinates and dimensions:
     $$x_c = \frac{x_{\min} + x_{\max}}{2}, \quad y_c = \frac{y_{\min} + y_{\max}}{2}, \quad w = x_{\max} - x_{\min}, \quad h = y_{\max} - y_{\min}$$
   - **Class Filtering (`HomeObjects-3K`):** Isolated Class `2` (`chair`), remapped to Class `4` (`chair_furniture`), and discarded all unrelated furniture categories (sofas, tables, beds).
3. **Decodability Gate:** Every candidate image was decoded and verified using PIL (`img.verify()` and `img.load()`).
4. **Coordinate Normalization:** Clamped bounding boxes to $[0.0, 1.0]$, rejecting degraded or collapsed boxes ($w \le 0.001$ or $h \le 0.001$).
5. **Deduplication:** Applied unique filename hashing and prefixing (`vx_<class_id>_<idx>_<stem>`) to avoid naming collisions.

---

## 8. Validation Results

Execution of `scripts/validate_dataset.py --config data/dataset.yaml` produced the following audit output:

```
==================================================
           VERIFYX DATASET VALIDATION             
==================================================
Config: C:\Users\heman\OneDrive\Desktop\VERIFYX\data\dataset.yaml
Resolved Data Root: C:\Users\heman\OneDrive\Desktop\VERIFYX\data
Declared Classes (8): {0: 'fire_extinguisher', 1: 'emergency_exit_sign', 2: 'hazard_sign', 3: 'box_carton', 4: 'chair_furniture', 5: 'cart_trolley', 6: 'pallet', 7: 'large_bin'}
--------------------------------------------------
Checking Split [TRAIN]:
  Images: C:\Users\heman\OneDrive\Desktop\VERIFYX\data\images\train
  Labels: C:\Users\heman\OneDrive\Desktop\VERIFYX\data\labels\train
Checking Split [VAL]:
  Images: C:\Users\heman\OneDrive\Desktop\VERIFYX\data\images\val
  Labels: C:\Users\heman\OneDrive\Desktop\VERIFYX\data\labels\val

--------------------------------------------------
DATASET VALIDATION SUMMARY
--------------------------------------------------
Total Images:     1280
Total Labels:     1280
Empty Labels:     30
Duplicate Names:  0
Corrupt Images:   0
Missing Labels:   0
Orphan Labels:    0
Invalid Labels:   0

Class Distribution:
  [0] fire_extinguisher     : 0
  [1] emergency_exit_sign   : 257
  [2] hazard_sign           : 254
  [3] box_carton            : 953
  [4] chair_furniture       : 545
  [5] cart_trolley          : 0
  [6] pallet                : 403
  [7] large_bin             : 0

--------------------------------------------------
STATUS: FAIL (Issues detected or class unrepresented)
--------------------------------------------------
```

### Data Integrity Metrics:
- **Image-to-Label Pairing:** 100% (1,280 images : 1,280 label files). Zero missing labels; zero orphan labels.
- **File Corruption:** 0 corrupt images.
- **Bounding Box Syntax:** 0 syntax or token errors. All box coordinates strictly within $[0.0, 1.0]$.
- **Negative Label Count:** 30 empty files matching negative corridor scenes.

---

## 9. Data Quality Problems

1. **Unrepresented Target Classes (Classes 0, 5, 7):** As audited in Phase 8.1, public datasets with verified permissive licenses (CC BY 4.0 / CC BY 2.0) are unavailable for commercial use without legal ambiguity (Objects365 restricts to academic use; GitHub repositories lack explicit licenses).
2. **Class Imbalance in Public Samples:**
   - `box_carton` (953 instances) and `chair_furniture` (545 instances) outnumber `emergency_exit_sign` (257) and `hazard_sign` (254).
   - This natural distribution reflects multi-object indoor scenes.
   - Project policy prohibits artificial duplication to inflate minority classes; class imbalance will be addressed through loss weighting (`cls_pw`) and targeted on-site smartphone data collection.

---

## 10. Remaining Data Gaps

Three classes currently possess **zero training instances** in the local dataset:
1. **Class 0 (`fire_extinguisher`):** Missing commercial red cylinder instances across varied mounting heights and lighting conditions.
2. **Class 5 (`cart_trolley`):** Missing rolling janitorial carts, utility wire carts, and hand trucks in pedestrian paths.
3. **Class 7 (`large_bin`):** Missing commercial waste bins, rolling trash receptacles, and industrial dumpsters.

---

## 11. Original Smartphone Data Needed

To close the remaining data gaps without legal risk or domain divergence, the on-site smartphone capture protocol must acquire **140–160 native frames** across campus/facility environments:

| Target Class | Frames Needed | Real-World Inspection Angles to Capture |
|:---|:---:|:---|
| **`fire_extinguisher`** | **45 frames** | • 20 wall-mounted on brackets (eye/torso height, varied corridor illumination).<br>• 15 inside recessed glass/metal cabinets (capturing glare and reflections).<br>• 10 floor-boot mounted or sitting on floor (obstruction condition). |
| **`cart_trolley`** | **35 frames** | • 20 janitorial/maintenance utility carts placed in corridors.<br>• 15 rolling hand trucks and parcel trolleys blocking access doors. |
| **`large_bin`** | **35 frames** | • 20 large commercial plastic rolling bins in utility corridors.<br>• 15 metal waste receptacles placed in egress pathways. |
| **`emergency_exit_sign`** (Supp.) | **15 frames** | • 15 long-range corridor perspectives (6–12 meters distance, low ambient light). |
| **`hazard_sign`** (Supp.) | **15 frames** | • 15 wall-mounted caution/warning placards under steep inspection pitch angles. |
| **TOTAL TO CAPTURE** | **145 frames** | **Annotated via CVAT/Roboflow and injected into `data/`** |

---

## 12. Training Readiness

Under strict project governance, model training is blocked until all declared classes possess verified, high-quality ground-truth annotations:

```
==================================================
DATASET STATUS:
NOT READY
==================================================
```

### Precise Explanation of What Is Missing:
1. **Class 0 (`fire_extinguisher`)**: 0 instances. Awaiting targeted smartphone capture of 45 physical extinguisher frames.
2. **Class 5 (`cart_trolley`)**: 0 instances. Awaiting targeted smartphone capture of 35 utility trolley frames.
3. **Class 7 (`large_bin`)**: 0 instances. Awaiting targeted smartphone capture of 35 commercial bin frames.
4. **Validation Gatekeeper**: `scripts/validate_dataset.py` currently reports `FAIL (Issues detected or class unrepresented)`. All 8 classes must achieve $>0$ instances before `train_yolo11n.py` is unlocked.

---
*Report audited in accordance with the VERIFYX Physical-World Verification Engineering Standard.*
