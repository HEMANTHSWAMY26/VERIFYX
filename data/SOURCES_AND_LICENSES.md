# VERIFYX Dataset Sources & Licensing Record

**Document Version:** 1.0.0  
**Audit Date:** Phase 8.2 — Dataset Curation & Quality Validation  
**Compliance Standard:** Creative Commons & Open-Source Permissive Use Only  

---

## 1. Approved Permissive Datasets (Active in Curated Dataset)

| Dataset Name | Original Platform / Repo | License | Source URL | Attribution Requirement | Classes Sourced & Mapped | Curated Images | Instances | Notes & Compliance |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **ExitSigns (Exit lights)** | Roboflow Universe via `khaledbjr/BCS407` | **CC BY 4.0** | [Roboflow Universe: Exit Lights](https://universe.roboflow.com/khaleds-workspace-f0mmh/exit-lights-oqpew) | Credit Roboflow user `khaleds-workspace-f0mmh` under CC BY 4.0 | `0: exit_light` $\rightarrow$ `1: emergency_exit_sign` | 250 | 257 | Validated illuminated & reflective exit signs. |
| **WetFloor (Wet floor signs complete)** | Roboflow Universe via `khaledbjr/BCS407` | **CC BY 4.0** | [Roboflow Universe: Wet Floor Signs](https://universe.roboflow.com/khaleds-workspace-f0mmh/wet-floor-signs-complete-ezynq-1uwnh) | Credit Roboflow user `khaleds-workspace-f0mmh` under CC BY 4.0 | `0: Wet-hazard-sign-drt9` $\rightarrow$ `2: hazard_sign` | 250 | 254 | High-contrast yellow caution folding A-frame placards. |
| **Package-Seg** | Ultralytics Open Logistics Asset | **AGPL-3.0** | [Ultralytics Assets: Package-Seg](https://github.com/ultralytics/assets/releases/download/v0.0.0/package-seg.zip) | Credit Ultralytics open logistics assets | `0: package` $\rightarrow$ `3: box_carton` | 250 | 953 | Polygon segmentation masks converted to normalized YOLO bboxes. |
| **HomeObjects-3K** | Ultralytics Open Asset / HomeObjects | **AGPL-3.0** | [Ultralytics Assets: HomeObjects-3K](https://github.com/ultralytics/assets/releases/download/v0.0.0/homeobjects-3K.zip) | Credit Ultralytics open benchmarks | `2: chair` $\rightarrow$ `4: chair_furniture` | 250 | 545 | Filtered strictly for indoor chairs. All non-chair classes discarded. |
| **Pallet-ZSFNN** | Roboflow Universe via `AgusRaharja69/palletYolov5` | **CC BY 4.0** | [Roboflow Universe: Palet ZSFNN](https://universe.roboflow.com/object-detection/palet-zsfnn) | Credit Roboflow workspace `object-detection` under CC BY 4.0 | `0: Wooden-Pallet` $\rightarrow$ `6: pallet` | 250 | 403 | Warehouse wooden logistics pallets on ground plane. |
| **Corridor Negative Samples** | Clean workplace corridors / floors | **Public Domain / Self-Generated** | Internal / ExitSigns clean floor subset | None required | None (Empty 0-byte label file) | 30 | 0 | Ground-truth negatives for spatial corridor false-positive suppression. |

---

## 2. Audited Candidate Datasets (Excluded / Prohibited)

| Candidate Dataset | Source Platform | Claimed / Found License | Audit Finding & Legal Assessment | Status | Reason for Rejection |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **Louis-0710/fire_extinguisher_yolo** | GitHub | **None / Unspecified** | Public GitHub repo without an explicit `LICENSE` file. Under project protocol: do not assume licenses. | **EXCLUDED** | **LICENSE UNCLEAR — DO NOT USE** |
| **Objects365 (Class 186: Fire Extinguisher)** | Objects365 Consortium | **Academic Only** (Annotations CC BY 4.0) | Official terms state: *"The Objects365 dataset is available for the academic purpose only."* Images are third-party Flickr links. | **EXCLUDED** | **LICENSE CONFLICT / COMMERCIAL RISK** |
| **FireNet (Boehm et al., 2019)** | UCL Research Data | **CC BY-NC 4.0** | Non-commercial restriction (NC) violates enterprise / unrestricted training standard. | **EXCLUDED** | **NON-COMMERCIAL RESTRICTION (CC BY-NC)** |
| **Kaggle Scraped Fire Archives** | Kaggle Community | **Unclear / None** | Unattributed web thumbnails with potential third-party copyright claims. | **EXCLUDED** | **LICENSE UNCLEAR — DO NOT USE** |
| **Garbage Classification 3 (TACO subset)** | Roboflow / Hugging Face | **CC BY 4.0** | Contains loose roadside litter (crushed cans, wrappers, bottles), not large commercial waste bins / dumpsters. | **EXCLUDED** | **SEMANTIC MISMATCH (Litter $\ne$ Large Bin)** |

---

## 3. Attribution Notices & Citations

1. **Exit Lights Dataset:**
   ```bibtex
   @misc{ exit-lights-oqpew_dataset,
       title = { Exit lights Dataset },
       type = { Open Source Dataset },
       author = { khaleds-workspace-f0mmh },
       howpublished = { \url{ https://universe.roboflow.com/khaleds-workspace-f0mmh/exit-lights-oqpew } },
       url = { https://universe.roboflow.com/khaleds-workspace-f0mmh/exit-lights-oqpew },
       journal = { Roboflow Universe },
       publisher = { Roboflow },
       year = { 2026 },
       month = { apr },
       note = { Licensed under CC BY 4.0 }
   }
   ```

2. **Wet Floor Signs Complete Dataset:**
   ```bibtex
   @misc{ wet-floor-signs-complete-ezynq-1uwnh_dataset,
       title = { wet floor signs complete Dataset },
       type = { Open Source Dataset },
       author = { khaleds-workspace-f0mmh },
       howpublished = { \url{ https://universe.roboflow.com/khaleds-workspace-f0mmh/wet-floor-signs-complete-ezynq-1uwnh } },
       url = { https://universe.roboflow.com/khaleds-workspace-f0mmh/wet-floor-signs-complete-ezynq-1uwnh },
       journal = { Roboflow Universe },
       publisher = { Roboflow },
       year = { 2026 },
       month = { apr },
       note = { Licensed under CC BY 4.0 }
   }
   ```

3. **Palet Dataset:**
   ```bibtex
   @misc{ palet-zsfnn_dataset,
       title = { Palet Dataset },
       type = { Open Source Dataset },
       author = { Object Detection Workspace },
       howpublished = { \url{ https://universe.roboflow.com/object-detection/palet-zsfnn } },
       url = { https://universe.roboflow.com/object-detection/palet-zsfnn },
       journal = { Roboflow Universe },
       publisher = { Roboflow },
       year = { 2022 },
       month = { oct },
       note = { Licensed under CC BY 4.0 }
   }
   ```

4. **Package-Seg & HomeObjects-3K:**
   ```text
   Ultralytics Open Vision Assets, distributed under the GNU Affero General Public License v3.0 (AGPL-3.0).
   Source: https://github.com/ultralytics/assets/releases
   ```
