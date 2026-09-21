# VERIFYX Phase 8.3 — MVP Taxonomy Decision

**Document Version:** 1.0.0  
**Phase:** 8.3 — MVP Class Reduction & Smartphone Data Decision  
**Status:** **TAXONOMY CONVERGED — TRAINING BLOCKED** (Awaiting Smartphone Capture Execution)  
**Target Runtime:** On-Device YOLO11n (2.6M params) + Corridor Geometry Rule Engine  

---

## 1. Decision

We formally reject **Architecture A (All 8 Classes)** and adopt **Architecture B: A Streamlined 5-Class High-Value Safety Taxonomy**.

### Core Engineering Rationale:
VERIFYX is not a general-purpose object detector or an open-world inventory scanner. The core product problem is:

$$\text{\textbf{“Can an offline smartphone reliably verify whether physical workplace safety conditions are satisfied?”}}$$

Attempting to train an 8-class model during the MVP phase introduces severe liabilities:
1. **Unnecessary Collection Burden:** Capturing and annotating 115+ smartphone images for low-priority objects (`cart_trolley`, `large_bin`) dilutes student team focus from high-impact safety verification.
2. **Feature Competition in Edge Detector:** In ultra-lightweight models (YOLO11n, 2.6M parameters), expanding classes without adequate data causes feature interference, gradient competition, and false-positive activations on phone sensors.
3. **Demonstration Grounding:** In an office, campus, or hackathon setting, inspectors verify fire extinguishers, exit signs, caution cones, delivery boxes, and misplaced chairs. Industrial dumpsters and wooden logistics pallets are irrelevant to standard indoor workplace inspections.

By reducing the detection head to **5 concrete classes (3 safety assets + 2 pathway obstacles)** evaluated alongside the **Clear Pathway Spatial Rule**, VERIFYX achieves high accuracy, fast edge latency (<15ms), and a closed-loop verification demo.

---

## 2. Why These Classes

The 5 selected MVP classes have been audited across regulatory importance, visual discriminability, edge detectability, and live demo impact:

### 1. `fire_extinguisher` (Class 0 — Safety Asset)
- **Business Importance:** Critical life-safety asset (NFPA 10 / OSHA 1910.157). Check #1 in standard safety audits.
- **Detection Usefulness:** Unambiguous physical signature (Safety Red cylinder, black discharge hose, pressure gauge, wall bracket).
- **Phone Detectability:** Outstanding contrast against neutral office/hallway walls at $1.5\text{m} - 6\text{m}$.
- **Demo Contribution:** The definitive showcase check. The user points the phone at a wall, and VERIFYX instantly confirms compliance.

### 2. `emergency_exit_sign` (Class 1 — Safety Asset)
- **Business Importance:** Mandatory egress routing (OSHA 1910.36 / ISO 7010). Check #2 in safety checklists.
- **Detection Usefulness:** Rectangular high-contrast geometry (green/white ISO running man or red/green illuminated "EXIT").
- **Dataset Availability:** 250 curated public images (257 verified instances, CC BY 4.0) already ingested.
- **Phone Detectability:** Mounted in the upper visual plane ($y < 0.40$), eliminating ground clutter confusion.

### 3. `hazard_sign` (Class 2 — Safety Asset)
- **Business Importance:** Physical hazard communication (ANSI Z535 / OSHA 1910.145). Check #3 in checklists.
- **Detection Usefulness:** High-visibility yellow folding A-frame "Caution: Wet Floor" signs and warning placards.
- **Dataset Availability:** 250 curated public images (254 verified instances, CC BY 4.0) already ingested.
- **Phone Detectability:** Vibrant chromatic signature ($H \in [25^\circ, 45^\circ]$), detectable even in peripheral vision.

### 4. `box_carton` (Class 3 — Pathway Obstacle)
- **Business Importance:** Walkway surface clearance (OSHA 1910.22). Delivery cartons are the single most common temporary corridor obstruction in commercial buildings.
- **Detection Usefulness:** Distinct planar geometry, corrugated cardboard texture, and clear floor-contact base.
- **Dataset Availability:** 250 curated images (953 verified instances, AGPL-3.0) already converted and validated.
- **Demo Contribution:** Perfect physical prop. A student can drop a cardboard delivery box in a hallway, trigger an instant `FAIL (Clear Pathway Obstructed)`, move the box away, and re-scan for an instant `PASS (5/5 Verified)`.

### 5. `chair_furniture` (Class 4 — Pathway Obstacle)
- **Business Importance:** Walkway clearance (OSHA 1910.22). Chairs pulled out from desks or conference rooms into fire escape corridors constitute frequent regulatory citations.
- **Detection Usefulness:** Structural legs, backrests, and seat cushions provide rich multi-scale feature points.
- **Dataset Availability:** 250 curated images (545 verified instances, AGPL-3.0) already converted and validated.
- **Demo Contribution:** Ubiquitous in any hackathon venue, campus, or office. Zero external props needed.

---

## 3. Classes Removed

### Full 8-Class Comparative Audit:

| Class Name | Target Category | Essential for MVP? | Justification | Dataset Status | Decision |
|:---|:---:|:---:|:---|:---:|:---:|
| `fire_extinguisher` | Safety Asset | **YES** | Primary regulatory check; iconic safety verification demonstration. | 0 public (license gap); 40 phone images planned. | **KEEP (Prioritize Capture)** |
| `emergency_exit_sign` | Safety Asset | **YES** | Egress route compliance; verified CC BY 4.0 data available. | 250 images / 257 instances ready. | **KEEP** |
| `hazard_sign` | Safety Asset | **YES** | Physical hazard notification; verified CC BY 4.0 data available. | 250 images / 254 instances ready. | **KEEP** |
| `box_carton` | Pathway Obstacle | **YES** | Most common real-world hallway obstacle; easy to test live. | 250 images / 953 instances ready. | **KEEP** |
| `chair_furniture` | Pathway Obstacle | **YES** | Ubiquitous office obstacle; distinct geometry from boxes. | 250 images / 545 instances ready. | **KEEP** |
| `cart_trolley` | Pathway Obstacle | **NO** | Specialized utility equipment. Adds 35 custom capture burden with marginal demo gain. | 0 public instances. | **REMOVE FROM MVP** |
| `pallet` | Pathway Obstacle | **NO** | Warehouse-specific asset. Irrelevant to indoor office/campus demo; potential false positives on wooden floors. | 250 images ready (archived). | **REMOVE FROM MVP** |
| `large_bin` | Pathway Obstacle | **NO** | Industrial outdoor/dock asset. Adds 35 custom capture burden; redundant obstacle morphology. | 0 public instances. | **REMOVE FROM MVP** |

### Detailed Elimination Justifications:

1. **Elimination of `cart_trolley`:**
   - Janitorial and utility carts have high morphological variance (wire racks, canvas laundry bins, flatbed dollies).
   - Public permissive datasets have zero verified clean instances.
   - Forcing a 2-person team to track down and photograph 35 commercial cleaning carts across campus drains time without changing the verification outcome. A box or chair proves the exact same spatial rule.
2. **Elimination of `large_bin`:**
   - Large wheeled dumpsters and industrial bins are located in loading docks, alleyways, and exterior disposal enclosures.
   - The VERIFYX MVP is explicitly framed around **indoor workplace and hallway safety**.
   - Conflating small desktop wastebaskets (which belong under desks) with large obstruction dumpsters creates severe false-positive risk.
3. **Elimination of `pallet`:**
   - Wooden logistics pallets are exclusive to industrial manufacturing and warehouse environments.
   - In standard carpeted or tiled office corridors, a wooden pallet is never naturally present.
   - Although 250 images were curated in Phase 8.2, keeping `pallet` in the active MVP model forces the detector to maintain filters for horizontal wood slats, increasing false alarms on parquet flooring, wooden desks, and stair treads. The curated pallet dataset will be archived for post-hackathon warehouse expansion.

---

## 4. Fire Extinguisher Decision

### Verdict: **YES — MANDATORY ORIGINAL SMARTPHONE CAPTURE**

A workplace safety verification application that cannot verify a fire extinguisher is fundamentally incomplete. Fire extinguisher verification is Check #1 in `VERIFYX_PROJECT.txt`, governed by NFPA 10 and OSHA 1910.157. Because public datasets either restrict commercial use (Objects365) or have missing license attribution, capturing native smartphone data is the only legally safe and technically robust path forward.

### Non-Arbitrary Capture Specification (Exactly 40 Images):
To guarantee generalization on mobile camera sensors without overfitting, 40 distinct frames will be captured across 5 physical facilities:

```
Total Fire Extinguisher Dataset: 40 Images (100% Native Smartphone)
├── Distance Variance (3 Tiers):
│   ├── Close-Range (1.0m - 1.5m): 10 images (Torso framing; captures valve, hose, gauge detail)
│   ├── Mid-Range (2.5m - 4.0m):   18 images (Full height framing; inspector walking approach)
│   └── Long-Range (5.0m - 8.0m):  12 images (Hallway perspective; small bounding box <10% frame)
│
├── Angle & Pitch Variance:
│   ├── Frontal (0° direct line-of-sight):          16 images
│   ├── Oblique Corridor (30° - 45° angle):         14 images
│   └── Steep Inspection Pitch (15° - 25° tilt):    10 images (Simulates standing inspector holding phone)
│
├── Mounting & Placement Conditions:
│   ├── Standard Wall-Bracket Mounted (1.0m - 1.5m above floor): 20 images
│   ├── Recessed Wall Cabinet (with glass reflection/glare):     12 images
│   └── Floor-Standing / Floor-Boot (ground proximity):           8 images
│
├── Ambient Illumination:
│   ├── Bright Fluorescent / LED Office Lighting: 18 images
│   ├── Dim Corridor / Utility Area Lighting:     12 images
│   └── Daylight Mixed / Backlit Window Glare:    10 images
│
└── Occlusion Scenarios:
    ├── Completely Unobstructed: 28 images
    └── Partially Occluded (15% - 30% by open door, pillar, or trash can): 12 images
```

---

## 5. Obstruction Detection Decision

### The Fallacy of "Detecting Everything":
Generic object detectors attempt to classify 80–365 consumer categories, resulting in diffuse feature representations, high edge latency, and unpredictable activations. Conversely, treating all obstacles as a single generic `obstruction_item` causes model failure because an office chair, a cardboard box, and a backpack share zero common visual geometry.

### The VERIFYX Two-Object Minimal Defensible Set:
We standardize strictly on **`box_carton`** and **`chair_furniture`**:
1. **Geometric Duality:**
   - `box_carton` represents **planar, convex, solid, ground-resting obstacles** with flat top surfaces.
   - `chair_furniture` represents **skeletal, multi-legged, concave obstacles** with see-through frames and vertical backrests.
2. **Floor Contact Accuracy:**
   - A box's ground contact is its continuous bottom edge ($y_{\text{base}} = y_c + h/2$).
   - A chair's ground contact is its caster or leg footprint.
3. **Sufficient Proof of the Spatial Rule:**
   - Demonstrating that the corridor polygon rule correctly flags a box placed in the walkway, and correctly clears the scene once the box is removed, proves the complete verification loop.
   - Adding 3 more obstacle types adds zero conceptual or technical value to the verification proof.

---

## 6. Final MVP Taxonomy

VERIFYX operates on a unified architecture separating **Object Perception** from **Spatial Safety Rules**:

```
================================================================================
                    VERIFYX FINAL MVP VISION TAXONOMY
================================================================================

SAFETY OBJECTS (Compliance Verification):
  • Class 0: fire_extinguisher       (NFPA 10 / OSHA 1910.157 Mounting & Access)
  • Class 1: emergency_exit_sign     (OSHA 1910.36 / ISO 7010 Egress Signage)
  • Class 2: hazard_sign             (ANSI Z535 / OSHA 1910.145 Warning Placards)

PATHWAY OBJECTS (Movable Floor Obstacles):
  • Class 3: box_carton              (Cardboard packages, shipping cartons)
  • Class 4: chair_furniture         (Office task chairs, stools, movable seating)

SCENE / SPATIAL GEOMETRIC RULE (Evaluated via Spatial Engine):
  • Clear Pathway                    (OSHA 1910.22 Walking-Working Surfaces)
    Formula:
    Clear Pathway = True  <==>  No ground contact point (x_base, y_base) of any
                                detected 'box_carton' or 'chair_furniture'
                                falls inside Corridor Polygon (x ∈ [0.20, 0.80], y ∈ [0.50, 0.98])
================================================================================
```

---

## 7. Required Original Smartphone Data

The original smartphone data collection protocol is restricted strictly to high-priority gaps:

| Category | Target Count | Hardware Target | Annotation Tool | Train (80%) | Val (20%) | Operational Purpose |
|:---|:---:|:---|:---|:---:|:---:|:---|
| **`fire_extinguisher`** | **40 images** | Android Phone Camera (12MP 4:3) | Roboflow / CVAT | 32 | 8 | Establishes native mobile sensor baseline for Class 0. |
| **`corridor_negative`** | **10 images** | Android Phone Camera (12MP 4:3) | None (0-byte labels) | 8 | 2 | Supplements public negatives with native campus hallways. |
| **TOTAL TO CAPTURE** | **50 images** | **Standard Smartphone** | **Manual BBox** | **40** | **10** | **Execution Time: ~75 minutes total** |

### Capture Execution Guidelines for 2-Person Team:
- **Device Setup:** Standard phone camera, default 1x focal length (24–28mm equivalent), 4:3 aspect ratio, auto-exposure, HDR enabled.
- **Protocol:** Walk through 4 distinct buildings (academic hall, library, laboratory, administrative office).
- **Time Budget:** 45 minutes handheld capture + 30 minutes tight bounding-box annotation.

---

## 8. Dataset Readiness Criteria

To prevent fake passes or premature training on degenerate data, the dataset gatekeeper (`scripts/validate_dataset.py`) must enforce strict mathematical readiness criteria:

### Quantitative Quality Thresholds:
1. **Zero Degenerate Samples:**
   - 0 missing labels (every image has an identical stem `.txt` file).
   - 0 orphan labels (every label has a decodable image).
   - 0 corrupt image headers (PIL decode verified).
   - 0 coordinate violations ($0.0 \le x_c, y_c \le 1.0$ and $0.005 < w, h \le 1.0$).
2. **Minimum Representation Per Class:**
   - `fire_extinguisher`: $\ge 35$ annotated instances (native phone).
   - `emergency_exit_sign`: $\ge 200$ annotated instances (public CC BY 4.0).
   - `hazard_sign`: $\ge 200$ annotated instances (public CC BY 4.0).
   - `box_carton`: $\ge 300$ annotated instances (public AGPL-3.0).
   - `chair_furniture`: $\ge 300$ annotated instances (public AGPL-3.0).
   - `negative_samples`: $\ge 30$ verified 0-byte label frames.
3. **Split Purity:**
   - Train/Val ratio strictly bounded in $78\% - 82\%$ train.
   - Zero image stem duplication across `train/` and `val/`.

Training will be unlocked **only when `scripts/validate_dataset.py` produces `STATUS: PASS` across all 5 active classes**.

---

## 9. Exact Next Step

1. **Step 1:** Update `data/dataset.yaml` to specify `nc: 5` with the final 5-class taxonomy (`fire_extinguisher`, `emergency_exit_sign`, `hazard_sign`, `box_carton`, `chair_furniture`).
2. **Step 2:** Prune `data/images` and `data/labels` to remove excluded Class 6 (`pallet`) files, preserving the clean 4-class public base + negatives.
3. **Step 3:** Prepare capture directory structure (`data/raw_smartphone/`) for the 50 phone images (40 extinguisher + 10 native negative).
4. **Step 4:** Stop and await user authorization before executing the smartphone capture session.

---

```
==================================================
FINAL MVP CLASSES:
0: fire_extinguisher
1: emergency_exit_sign
2: hazard_sign
3: box_carton
4: chair_furniture

ORIGINAL IMAGES REQUIRED:
40 fire_extinguisher frames + 10 native corridor negatives
(Total: 50 original smartphone images)

TRAINING STATUS:
BLOCKED
==================================================
```
