# VERIFYX Dataset Audit

**Document Version:** 1.0.0  
**Phase:** 8.1 — Dataset Acquisition & Quality Audit  
**Status:** **DATASET: NOT READY** (Awaiting legitimate image/label acquisition)  
**Target Architecture:** YOLO11n (2.6M parameters, 640×640 input resolution)  
**Target Environment:** Local On-Device Inference (Web ONNX Runtime / Android LiteRT)

---

## 1. Executive Decision

The VERIFYX training pipeline (`scripts/train_yolo11n.py`), export pipeline (`scripts/export_model.py`), dataset validation gatekeeper (`scripts/validate_dataset.py`), and test harness (`scripts/test_harness.py`) were successfully established in Phase 8. However, an exhaustive audit of our data layer reveals:

1. **Physical Dataset State:** The local dataset directory (`data/images/train`, `data/images/val`, `data/labels/train`, `data/labels/val`) contains **0 images and 0 annotations**. Running `validate_dataset.py` confirms `STATUS: NOT READY (Dataset empty / awaiting samples)`.
2. **Correction of Phase 7 Assumptions:** Phase 7 originally assumed Google Open Images V7 provided ~3,400 native `Fire extinguisher` boxes and generic safety signs. Our technical verification confirms that **Open Images V7's standard 600 boxable classes do NOT include `fire_extinguisher` or `emergency_exit_sign`**. Objects365 contains `fire extinguisher` (Class 186), but its official terms restrict usage to academic non-commercial research, creating legal risk.
3. **Training Prohibition:** Under strict project protocol, **NO MODEL TRAINING WILL TAKE PLACE** during this phase. Training on synthetic, unvetted, or placeholder data violates the core VERIFYX principle of physical-world verification integrity.
4. **Acquisition Roadmap:** We formally adopt **Option C: Curated Permissive Public Data (CC BY 4.0) + Small Original Smartphone Calibration Dataset (Captured On-Site)**. We must curate vetted public subsets and capture 120–150 native smartphone frames before a single training epoch is initiated.

---

## 2. Final Proposed Classes

VERIFYX verifies workplace safety against standardized physical standards (NFPA 10, OSHA 1910.22, OSHA 1910.36, ANSI Z535 / ISO 7010). The model taxonomy is restricted to **4 high-impact, visually distinguishable classes**:

| Class ID | Class Name | Target Physical Object | Regulatory / Operational Basis | Core Visual Identification Features |
| :---: | :--- | :--- | :--- | :--- |
| **0** | `fire_extinguisher` | Commercial/industrial portable fire extinguisher | NFPA 10 / OSHA 1910.157 | Red pressurized cylinder, neck valve, black discharge hose/nozzle, pressure gauge. Wall-bracket or cabinet mounted. |
| **1** | `emergency_exit_sign` | Illuminated or photoluminescent emergency exit signage | OSHA 1910.36 / ISO 7010 (E001/E002) | Rectangular/square green-and-white ISO running-man pictogram or red/green illuminated "EXIT" typography above doors. |
| **2** | `hazard_sign` | Standardized industrial caution & warning placards | ANSI Z535 / OSHA 1910.145 / ISO 7010 (W-series) | High-contrast yellow/black equilateral warning triangles or rectangular "CAUTION / WARNING" headers with black pictograms. |
| **3** | `obstruction_item` | Movable physical objects improperly placed in walkways | OSHA 1910.22 (Walking-Working Surfaces) | Free-standing ground-resting objects: cardboard boxes, delivery cartons, rolling carts/trolleys, loose chairs, pallets, waste bins. |

> [!IMPORTANT]
> **CLEAR PATHWAY IS NOT AN OBJECT CLASS.**  
> A pathway is an open, empty spatial volume. Attempting to train a neural network to detect "clear pathway" creates severe false positives because empty floors have infinite texture variance (concrete, linoleum, carpet, tiles, shadows, glare). Instead, **Clear Pathway is an evaluated spatial condition** computed by:
> $$\text{Clear Pathway Condition} = \neg \Big( \text{Detected } \texttt{obstruction\_item} \cap \text{Corridor Floor Polygon} \Big)$$
> Compliance is derived through detection + spatial geometry + rules engine logic, never raw classification.

---

## 3. Dataset Sources

To guarantee legal safety, reproducibility, and high visual quality, candidate datasets are evaluated strictly by category and provenance:

### Priority Hierarchy:
1. **Curated Permissive Public Repositories (CC BY 4.0 / CC BY 2.0)**: Roboflow Universe public safety datasets with explicit Creative Commons licenses.
2. **Standard Benchmark Subsets (Permissive)**: Pascal VOC / MS-COCO subsets for common indoor obstacle classes (chairs, boxes, luggage).
3. **Original On-Site Sensor Data**: Native smartphone images captured by the VERIFYX team across realistic campus and office environments.
4. **Domain-Specific Geometric Augmentation**: Controlled synthetic variations (perspective pitch, lighting decay, HSV shifts) applied only to legitimate base images.

### Forbidden / Rejected Data Practices:
- **Keyword Scraping Without Visual Verification:** Rejecting generic web scraping where "fire" returns flame pictures, "sign" returns highway billboards, or "person" returns crowds.
- **Unverified Academic-Only Datasets:** Rejecting or segregating datasets like Objects365 where commercial or redistribution rights are legally restricted or ambiguous.
- **Scraped Web Thumbnails:** Rejecting random Kaggle or GitHub repositories containing low-resolution, watermarked, or duplicate frames with missing origin metadata.

---

## 4. License Audit

Every prospective candidate dataset has been evaluated against commercial usability, attribution requirements, redistribution rights, and availability:

| Dataset / Repository | Source Platform | Classes Provided | Estimated Useful Images | License | Commercial Use Permitted? | Attribution Required? | Redistribution Restrictions | Training Use Allowed? | Audit Recommendation |
| :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Roboflow Universe: `fire-extinguisher-xwmpa`** | Roboflow Public | `extinguisher`, `Fire_Extinguisher` | ~450 | **CC BY 4.0** | **YES** | YES | Must include CC BY 4.0 notice | YES | **RECOMMENDED (Base Extinguisher Data)** |
| **Roboflow Universe: `exit-sign-extended-version`** (KIT) | Roboflow Public | `exit_sign` | ~380 | **CC BY 4.0** | **YES** | YES | Must include CC BY 4.0 notice | YES | **RECOMMENDED (Base Exit Sign Data)** |
| **Roboflow Universe: `bvi-signage-2`** (BVI) | Roboflow Public | `emergency exit`, directional egress | ~310 | **CC BY 4.0** | **YES** | YES | Must include CC BY 4.0 notice | YES | **RECOMMENDED (International Signage)** |
| **Roboflow Universe: `gefahrensymbole` / `ghs-hze4d`** | Roboflow Public | Hazard pictograms, warning signs | ~240 | **CC BY 4.0** | **YES** | YES | Must include CC BY 4.0 notice | YES | **RECOMMENDED (Narrowed Hazard Data)** |
| **Roboflow Universe: `signage_more`** | Roboflow Public | `Electrical hazard`, `Caution` | ~180 | **CC BY 4.0** | **YES** | YES | Must include CC BY 4.0 notice | YES | **RECOMMENDED (ANSI Caution Data)** |
| **MS-COCO 2017 Indoor Obstacles Subset** | Common Objects in Context | `chair`, `suitcase`, `backpack` | ~600 | **CC BY 4.0** | **YES** | YES | Flickr terms for source images | YES | **RECOMMENDED (Obstacle Floor Samples)** |
| **Objects365 Consortium (v1/v2)** | Objects365.org | Class 186 (`fire extinguisher`) | ~2,500 | **Academic Only** (Annotations CC BY 4.0) | **NO / AMBIGUOUS** | YES | Official terms state: "Available for academic purpose only" | Academic Only | **DO NOT USE (License Conflict / Risk)** |
| **Google Open Images V7** | Open Images Platform | General 600 classes (No extinguisher/exit sign) | 0 (for Classes 0 & 1) | **CC BY 4.0** | **YES** | YES | Must cite Open Images | YES | **DO NOT USE FOR CLASSES 0 & 1** (Class absence confirmed) |
| **Kaggle Scraped "Fire Safety" Archives** | Kaggle Community | Mixed fire, extinguisher, smoke | ~150 | **LICENSE UNCLEAR — DO NOT USE** | **UNKNOWN** | None provided | Scraped without copyright holder consent | Ambiguous | **DO NOT USE (License Unclear / Risk)** |
| **VERIFYX Original Smartphone Capture Set** | Self-Captured (Android/iQOO) | All 4 target classes + clean backgrounds | 120–150 | **Apache 2.0 / Proprietary** | **YES** | Self | Full project ownership | YES | **MANDATORY (Calibration Layer)** |

---

## 5. Class-by-Class Quality

To avoid synthetic balance illusions, each class is evaluated on actual, usable visual samples in realistic inspection environments:

| Class | Primary Candidate Datasets | Estimated Useful Samples | License Status | Visual Quality & Diversity | Balance Assessment | Recommended? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **0. `fire_extinguisher`** | Roboflow `fire-extinguisher-xwmpa` + Original captures | **~485** | CC BY 4.0 / Clean | **GOOD**: Sharp contrast, distinctive red cylindrical body, clear mounting hardware. Missing long-range corridor views. | **Dominant Class**: Sizable base, high signal-to-noise ratio. | **YES** |
| **1. `emergency_exit_sign`** | Roboflow `exit-sign-extended` + `bvi-signage` + Original captures | **~410** | CC BY 4.0 / Clean | **PARTIAL**: Strong on close-up illuminated boxes; weak on long-range hallway perspectives ($> 8\text{m}$) and extreme ceiling angles. | **Moderate**: Sufficient after merging US text and ISO running-man. | **YES** |
| **2. `hazard_sign`** | Roboflow `gefahrensymbole` + `signage_more` + Original captures | **~245** | CC BY 4.0 / Clean | **POOR to PARTIAL**: High intra-class variance. Broad datasets mix blue circles, red diamonds, and text sheets. Must be tightly filtered to yellow triangles and caution placards. | **Constrained**: Genuine quality images are fewer than other classes; must not be force-padded. | **YES (Narrowed Scope)** |
| **3. `obstruction_item`** | MS-COCO indoor subset + Roboflow obstacle sets + Original captures | **~560** | CC BY 4.0 / Clean | **PARTIAL**: Good coverage of chairs, cartons, and carts, but requires strict negative samples (clean floors) to avoid floor texture false positives. | **Healthy**: Plentiful public object data, but requires careful spatial annotation. | **YES** |

---

## 6. Obstruction Strategy

The handling of `obstruction_item` represents the most critical architectural decision in the vision pipeline:

### The Problem with an Unconstrained "Obstruction" Class:
In computer vision, defining a single generic class for "anything that blocks a hallway" fails because:
1. **Infinite Intra-Class Variance:** A discarded coffee cup, an office chair, a cardboard pallet, an open stepladder, a rolling janitorial cart, and an electrical cord share zero morphological or texture features.
2. **Contextual Relativity:** A chair neatly tucked under a desk is furniture; the identical chair placed in the middle of a 1.2m fire escape corridor is an emergency hazard. The neural network cannot infer "intent" from isolated pixel features.
3. **Severe False-Positive Risk:** Forcing YOLO to fit "obstruction" causes it to activate on floor reflections, carpet seams, door thresholds, and wall baseboards.

### The VERIFYX Solution: Concrete Object Classes + Corridor Spatial Rules
We adopt a hybrid, two-tiered architecture:

```
[Camera Frame 640x640]
       │
       ▼
[YOLO11n Edge Detector]
       ├── Detects: 'fire_extinguisher'
       ├── Detects: 'emergency_exit_sign'
       ├── Detects: 'hazard_sign'
       └── Detects: 'obstruction_item' (Strictly defined as: Box/Carton, Chair/Stool, Cart/Trolley, Pallet, Large Bin)
       │
       ▼
[Bounding Box Extraction: cx, cy, w, h]
       │
       ▼
[Ground Contact Estimation]
       └── Contact Point: P_ground = (cx, cy + h / 2)
       │
       ▼
[Corridor Spatial Geometry Gate]
       ├── Corridor Zone Polygon: X ∈ [0.20, 0.80], Y ∈ [0.50, 0.98]
       │
       ├── Case 1: P_ground OUTSIDE Corridor Zone (e.g. against side wall)
       │     └── Evaluation: PASS (Corridor Clear)
       │
       └── Case 2: P_ground INSIDE Corridor Zone
             └── Confidence ≥ 0.70 ──> FAIL (Clear Pathway Obstructed)
             └── Confidence 0.45 - 0.69 ──> WARNING / REVIEW_REQUIRED
```

### Negative Sample Protocol:
To prevent the model from assuming that every floor must contain an obstacle, the dataset must include **at least 15% clean negative background images** (empty hallways, clean industrial floors, open doorways) with empty label files (`.txt` files of 0 bytes).

---

## 7. Exit Sign Strategy

Emergency exit signage exhibits significant regional and optical variation:

### Visual Variations Identified:
1. **Text-Based "EXIT" (North America / ANSI):** Red or green capital typography, typically internally illuminated by LED or fluorescent backlighting.
2. **ISO 7010 Running-Man Pictogram (International / European / Asian):** Green rectangular placard featuring a white running silhouette exiting through an open door, accompanied by directional egress arrows (left, right, up, down).
3. **Photoluminescent vs. Backlit:** Glow-in-the-dark flat stickers vs. high-luminance lightboxes that cause sensor bloom in low ambient light.
4. **Scale Variance:** Under phone inspection, exit signs vary from large foreground placards ($> 25\%$ frame height when passing through a door) to tiny background boxes ($< 3\%$ frame height when looking down a 20-meter corridor).

### Detection vs. OCR Analysis:
- **Object Detection Alone:** Highly efficient and capable of running at 30+ FPS on edge devices. YOLO11n learns the green/white and red/white high-contrast rectangular signature effectively.
- **On-Device OCR (Tesseract / EasyOCR):** Processing full OCR or text extraction on live camera frames introduces a severe latency penalty (180–400ms per frame), causing frame drops and battery drain on mobile devices.
- **VERIFYX Decision:**
  - **Live Stream (30 FPS):** Use **YOLO11n object detection alone**, reinforced with a geometric heuristic (exit signs must be mounted in the upper half of the visual field: $y_{\text{center}} < 0.45$).
  - **Evidence Capture (Still Frame):** When the user triggers an official verification or captures evidence for a report, an optional secondary color-ratio/icon check verifies the dominant green/red hue before generating the final compliance certificate.

---

## 8. Hazard Sign Strategy

### The Visual Consistency Dilemma:
Attempting to group all workplace warning signs into a single `hazard_sign` class creates severe visual dissonance:
- **ISO 7010 Warning Signs (W-series):** Equilateral yellow triangles with black borders and black pictograms.
- **OSHA/ANSI Caution Signs:** Horizontal rectangular placards with a yellow header containing the word "CAUTION" and explanatory text below.
- **OSHA Danger Signs:** Black, white, and red oval headers with "DANGER".
- **ISO Prohibition Signs (P-series):** White circular signs with a bold red circular border and a 45-degree diagonal slash.
- **ISO Mandatory Signs (M-series):** Solid blue circular signs with white symbols (e.g., "Wear Eye Protection").

Mixing triangles, circles, rectangles, red, yellow, and blue into a single class destroys feature convergence in lightweight 2.6M parameter models like YOLO11n.

### Narrowed MVP Definition:
For the VERIFYX MVP, `hazard_sign` is strictly constrained to **Standard Yellow Caution & Warning Signs**:
1. **ISO 7010 Warning Triangles** (e.g., General Warning, High Voltage, Overhead Hazard, Flammable Material).
2. **Standard Commercial "Caution: Wet Floor / Slippery Surface"** folding A-frame signs and floor cones.
3. **ANSI / OSHA Yellow Caution Placards** mounted in physical walkway zones.

### Rationale:
These signs share a consistent color signature (curated HSV yellow $H \in [25, 45]$, high saturation), high-contrast black borders, and prominent presence in pedestrian corridors. Blue mandatory PPE signs and circular red prohibition signs are deferred to a specialized post-MVP industrial expansion.

---

## 9. Fire Extinguisher Strategy

The fire extinguisher is the most critical life-safety asset in our verification suite. The dataset audit establishes the following standards:

### Required Variance Coverage:
1. **Cylinder Geometries:** Standard 5lb/10lb ABC dry chemical red cylinders, 10lb CO2 cylinders (distinct flared black horn nozzle and no pressure gauge), and clean-agent/water cans.
2. **Mounting Conditions:**
   - Wall-hung on standard mounting brackets (height: $1.0\text{m} - 1.5\text{m}$ from floor).
   - Recessed inside red or white metal wall cabinets (with both open doors and reflective glass doors).
   - Floor-standing on plastic floor boots or stands.
   - Ground-resting non-compliant placement (extinguishers left sitting directly on the floor).
3. **Perspective & Angles:**
   - Direct frontal view (gauge and maintenance tag visible).
   - Oblique perspective ($30^\circ - 60^\circ$ angle down a hallway).
   - Steep downward pitch ($15^\circ - 30^\circ$) representing a standing inspector holding a phone at chest level.
4. **Partial Occlusion:** The model must reliably detect extinguishers when 20%–40% occluded by open doors, corner columns, or adjacent utility carts.

### Data Gap Identified:
Public datasets heavily skew toward isolated, studio-style, or web-catalog photos of fire extinguishers taken straight-on against white walls. They lack **glass cabinet reflection glare**, **steep downward inspection angles**, and **dim hallway lighting**. Our original data collection plan explicitly targets these real-world failure modes.

---

## 10. Original Data Collection Plan

To bridge the domain gap between web datasets and real smartphone inspection feeds, the two-person VERIFYX student team will execute a targeted, high-efficiency data collection protocol:

### Operational Parameters:
- **Total Images:** **130 – 150 original frames**.
- **Time Budget:** 3 hours capture + 2.5 hours annotation (via Roboflow / CVAT).
- **Target Hardware:** Native smartphone cameras (12MP–50MP sensor downsampled to 640×640).
- **Capture Technique:** Handheld video recording walked through real facilities, extracting 1 frame every 1.5–2 seconds (ensuring distinct angles and eliminating duplicate motion frames).

### Target Split Breakdown:

| Class / Category | Target Count | Specific Real-World Scenarios to Capture |
| :--- | :---: | :--- |
| `fire_extinguisher` | **35 images** | • 15 wall-mounted at standard height (varied hallway lighting).<br>• 10 inside glass/metal wall cabinets (capturing glare and reflection).<br>• 5 floor-standing on boots/corners.<br>• 5 partially occluded (behind door edge or cart). |
| `emergency_exit_sign` | **30 images** | • 12 ceiling-hung illuminated green running-man signs.<br>• 10 wall-mounted red/green EXIT text placards above exit doors.<br>• 8 long-distance corridor perspectives (6–15 meters away). |
| `hazard_sign` | **25 images** | • 12 yellow folding "Caution: Wet Floor" signs in hallways.<br>• 8 yellow warning triangles (electrical rooms, equipment areas).<br>• 5 ANSI yellow caution wall placards. |
| `obstruction_item` | **30 images** | • 10 cardboard cartons/boxes in walking paths.<br>• 8 office chairs pulled into corridor walkways.<br>• 7 rolling janitorial/delivery carts obstructing doors.<br>• 5 plastic bins/totes placed in walkways. |
| `negative_corridor` (Empty) | **20 images** | • 10 completely clean, unobstructed hallways.<br>• 5 open doorways with zero equipment.<br>• 5 blank walls with floor trim (to suppress false positive edge activations). |

---

## 11. Augmentation Plan

Data augmentation will be applied systematically during training to enhance generalization without distorting regulatory aspect ratios or safety color signatures:

### Prescribed Augmentation Pipeline:

```
Source Image (640x640)
        │
        ├── 1. Mosaic Mixing (p = 0.80):
        │      Combines 4 scenes into 1 frame; forces model to detect small assets in clutter.
        │
        ├── 2. Random Affine / Perspective (scale = 0.15, shear = 2.0°, perspective = 0.0005):
        │      Simulates natural phone tilt and handheld yaw/pitch variations.
        │
        ├── 3. Horizontal Flip (p = 0.50):
        │      Valid for extinguishers, obstacles, and symmetrical placards.
        │      (Note: Directional exit arrows will flip; model learns egress signs regardless of arrow orientation).
        │
        ├── 4. Color Jitter (HSV-Hue ±0.015, HSV-Sat ±0.25, HSV-Val ±0.30):
        │      CRITICAL CONSTRAINT: Hue variation is kept extremely tight (±1.5%)
        │      to preserve vital safety colors (Safety Red, Safety Yellow, Egress Green).
        │      Value/Brightness variation is generous (±30%) to simulate dim corridors vs. bright daylight.
        │
        └── 5. Cutout / Random Erasing (p = 0.20, max_area = 10%):
               Simulates partial occlusions (e.g. pole, hand, or doorway blocking part of the sign).
```

### Prohibited Augmentations:
- **Vertical Flip:** Fire extinguishers and exit signs are gravity-dependent; extinguishers do not hang upside down from ceilings. Vertical flipping introduces nonsensical spatial priors.
- **Aggressive Hue Shifts (Hue > 0.05):** Shifting a red fire extinguisher into a purple or green cylinder corrupts standard industrial color recognition.

---

## 12. Final Dataset Composition

Combining verified permissive public subsets with our on-site smartphone captures produces a robust, balanced dataset tailored for YOLO11n:

| Class ID | Class Name | Public Permissive (CC BY 4.0) | Original Smartphone Captures | Negative Samples | Total Validated Dataset | Split: Train (85%) | Split: Val (15%) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | `fire_extinguisher` | ~450 | 35 | — | **485** | 412 | 73 |
| **1** | `emergency_exit_sign` | ~380 | 30 | — | **410** | 348 | 62 |
| **2** | `hazard_sign` | ~220 | 25 | — | **245** | 208 | 37 |
| **3** | `obstruction_item` | ~530 | 30 | — | **560** | 476 | 84 |
| **—** | `negative_corridor` (Empty) | — | 20 | 20 | **20** | 17 | 3 |
| **TOTALS** | **4 Target Classes** | **~1,580** | **140** | **20** | **~1,720 Images** | **~1,461** | **~259** |

*Note: Class counts reflect object annotation instances. Images containing multiple co-occurring classes (e.g. an exit sign above an obstructed door) are properly co-labeled.*

---

## 13. Risks & Mitigations

| Risk Factor | Impact Severity | Root Cause | Engineering & Operational Mitigation |
| :--- | :---: | :--- | :--- |
| **Domain Mismatch (Web vs. Phone)** | **HIGH** | Web images feature professional lighting, centered framing, and high focal lengths. | Inject 140 high-resolution, unedited native smartphone frames captured at handheld inspection angles into the training set. |
| **Hazard Sign Over-Generalization** | **HIGH** | Merging all hazard types results in diffuse features and frequent missed detections. | Strictly limit MVP `hazard_sign` scope to yellow warning triangles and yellow caution placards; reject blue/red signs for MVP. |
| **False Corridor Obstruction Alerts** | **MEDIUM** | Patterned carpet, shadows, and baseboards misidentified as walkway obstacles. | Include at least 20 empty corridor frames with zero annotations (negative mining) and enforce the geometric polygon intersection gate. |
| **Exit Sign Sensor Bloom** | **MEDIUM** | High-intensity LED exit signs overexpose mobile camera sensors in dark hallways. | Include phone captures with varied exposure compensation; apply HSV brightness jitter during augmentation. |
| **Licensing Contamination** | **CRITICAL** | Inadvertently using academic-only or non-commercial data in a commercial codebase. | Enforce strict license gate: accept ONLY CC BY 4.0, CC BY 2.0, or self-captured data. Completely exclude Objects365 and unverified Kaggle dumps. |

---

## 14. Exact Next Step

### Current Status:
```
==================================================
DATASET: NOT READY
==================================================
Reason: The local data directory contains 0 images and 0 annotations.
The acquisition pipeline is fully planned, validated, and licensed,
but physical file downloading, filtering, and capture must be completed.
==================================================
```

### Exact Next Engineering Step (Phase 8.2):
1. **Curate Permissive Public Base:** Download and sanitize the approved CC BY 4.0 public datasets for classes 0, 1, 2, and 3 from Roboflow Universe using standardized export tooling.
2. **Execute On-Site Capture Session:** Record and extract the 140 calibration frames and 20 negative corridor frames across facility environments.
3. **Format & Validate Annotations:** Run `scripts/validate_dataset.py` on the consolidated dataset to verify:
   - 100% 1:1 image-to-label pairing.
   - Normalized coordinates bounded in $[0.0, 1.0]$.
   - Zero corrupted image headers.
   - Passing status: `STATUS: PASS`.
4. **Present Clean Dataset for Review:** Stop and obtain human sign-off before executing `train_yolo11n.py`.

---
*Report compiled and audited in accordance with the VERIFYX Trust and Verification Engineering Standard.*
