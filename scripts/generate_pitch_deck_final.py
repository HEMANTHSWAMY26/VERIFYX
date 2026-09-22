"""
VERIFYX Pitch Deck Generator — Visual-First Minimal Edition (Refined & Perfected)
Creates verifyx_pitch_deck_final.pptx with strict 12-column grid alignment,
minimal text (one slide = one message), and 100% verified workplace dataset visuals.
Zero personal photos, zero faces, zero overlapping elements.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
COLOR_BG = RGBColor(11, 15, 23)          # #0B0F17 Charcoal Obsidian
COLOR_SURFACE = RGBColor(19, 27, 38)     # #131B26 Subtle Card Surface
COLOR_BORDER = RGBColor(30, 41, 59)      # #1E293B Slate Border
COLOR_WHITE = RGBColor(248, 250, 252)    # #F8FAFC Primary Clean Text
COLOR_MUTED = RGBColor(148, 163, 184)    # #94A3B8 Slate 400 Muted Text
COLOR_DARK_MUTED = RGBColor(71, 85, 105) # #475569 Slate 600 Footnote Text
COLOR_CYAN = RGBColor(0, 229, 255)       # #00E5FF Vibrant Electric Cyan
COLOR_GREEN = RGBColor(16, 185, 129)     # #10B981 Emerald Green
COLOR_RED = RGBColor(239, 68, 68)        # #EF4444 Warning Coral Red

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"

# ─── 12-COLUMN GRID CALCULATIONS ──────────────────────────────────────────────
SLIDE_WIDTH_IN = 13.333333
SLIDE_HEIGHT_IN = 7.5

MARGIN_LEFT = Inches(1.0)
GUTTER = Inches(0.25)
TOTAL_USABLE_W = Inches(11.333333)

COL_WIDTH = (TOTAL_USABLE_W - 11 * GUTTER) / 12  # ~0.7153 inches

def col_x(col_index):
    """X coordinate for the start of column col_index (0 to 11)."""
    return MARGIN_LEFT + col_index * (COL_WIDTH + GUTTER)

def col_w(num_cols):
    """Width spanning num_cols columns including intervening gutters."""
    return num_cols * COL_WIDTH + (num_cols - 1) * GUTTER

# ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

def set_slide_background(slide):
    """Fills slide background with near-black charcoal."""
    bg_shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_WIDTH_IN), Inches(SLIDE_HEIGHT_IN)
    )
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = COLOR_BG
    bg_shape.line.color.rgb = COLOR_BG
    return bg_shape

def add_header(slide, kicker, title, subtitle=None):
    """Creates a consistent, aligned header on the 12-column grid."""
    # Kicker / Eyebrow
    k_box = slide.shapes.add_textbox(col_x(0), Inches(0.70), col_w(12), Inches(0.28))
    tf_k = k_box.text_frame
    tf_k.margin_left = tf_k.margin_top = tf_k.margin_right = tf_k.margin_bottom = 0
    p_k = tf_k.paragraphs[0]
    p_k.text = kicker.upper()
    p_k.font.name = FONT_HEADING
    p_k.font.size = Pt(11)
    p_k.font.bold = True
    p_k.font.color.rgb = COLOR_CYAN

    # Main Headline
    t_box = slide.shapes.add_textbox(col_x(0), Inches(0.98), col_w(12), Inches(0.65))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(32)
    p_t.font.bold = True
    p_t.font.color.rgb = COLOR_WHITE

    # Subtitle / Supporting sentence
    if subtitle:
        s_box = slide.shapes.add_textbox(col_x(0), Inches(1.68), col_w(12), Inches(0.35))
        tf_s = s_box.text_frame
        tf_s.word_wrap = True
        tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle
        p_s.font.name = FONT_BODY
        p_s.font.size = Pt(14)
        p_s.font.bold = False
        p_s.font.color.rgb = COLOR_MUTED

def add_footer(slide, current_slide, total_slides=10):
    """Draws a consistent footer at the bottom of the slide."""
    div = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, col_x(0), Inches(6.85), col_w(12), Inches(0.015)
    )
    div.fill.solid()
    div.fill.fore_color.rgb = COLOR_BORDER
    div.line.fill.background()

    l_box = slide.shapes.add_textbox(col_x(0), Inches(6.92), col_w(6), Inches(0.3))
    tf_l = l_box.text_frame
    tf_l.margin_left = tf_l.margin_top = tf_l.margin_right = tf_l.margin_bottom = 0
    p_l = tf_l.paragraphs[0]
    p_l.text = "VERIFYX  ·  AI VISUAL VERIFICATION ENGINE"
    p_l.font.name = FONT_BODY
    p_l.font.size = Pt(9.5)
    p_l.font.color.rgb = COLOR_DARK_MUTED

    r_box = slide.shapes.add_textbox(col_x(6), Inches(6.92), col_w(6), Inches(0.3))
    tf_r = r_box.text_frame
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0
    p_r = tf_r.paragraphs[0]
    p_r.text = f"verifyx-gray.vercel.app  ·  {current_slide:02d} / {total_slides:02d}"
    p_r.alignment = PP_ALIGN.RIGHT
    p_r.font.name = FONT_BODY
    p_r.font.size = Pt(9.5)
    p_r.font.color.rgb = COLOR_DARK_MUTED

def add_card_box(slide, left, top, width, height, bg_rgb=COLOR_SURFACE, border_rgb=COLOR_BORDER):
    """Creates a clean container card."""
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_rgb
    card.line.color.rgb = border_rgb
    card.line.width = Pt(1)
    return card

def set_speaker_notes(slide, notes_text):
    """Sets speaker notes for the slide."""
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_text.strip()


# ─── SLIDE BUILDERS ───────────────────────────────────────────────────────────

def build_slide_1_hero(prs):
    """Slide 1 — HERO: VERIFYX / VERIFY BEFORE YOU TRUST."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    # Left: Typography & Badges (Cols 0-5)
    left_x = col_x(0)
    left_w = col_w(6)

    # Kicker
    k_box = slide.shapes.add_textbox(left_x, Inches(1.6), left_w, Inches(0.35))
    tf_k = k_box.text_frame
    tf_k.margin_left = tf_k.margin_top = tf_k.margin_right = tf_k.margin_bottom = 0
    p_k = tf_k.paragraphs[0]
    p_k.text = "VERIFYX"
    p_k.font.name = FONT_HEADING
    p_k.font.size = Pt(14)
    p_k.font.bold = True
    p_k.font.color.rgb = COLOR_CYAN

    # Giant Headline (Clean 2-line break)
    h_box = slide.shapes.add_textbox(left_x, Inches(2.0), left_w + Inches(0.5), Inches(1.5))
    tf_h = h_box.text_frame
    tf_h.word_wrap = True
    tf_h.margin_left = tf_h.margin_top = tf_h.margin_right = tf_h.margin_bottom = 0
    p_h = tf_h.paragraphs[0]
    p_h.text = "VERIFY BEFORE\nYOU TRUST."
    p_h.font.name = FONT_HEADING
    p_h.font.size = Pt(40)
    p_h.font.bold = True
    p_h.font.color.rgb = COLOR_WHITE

    # Short supporting line
    s_box = slide.shapes.add_textbox(left_x, Inches(3.75), left_w, Inches(0.75))
    tf_s = s_box.text_frame
    tf_s.word_wrap = True
    tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
    p_s = tf_s.paragraphs[0]
    p_s.text = "AI-powered visual verification for physical workplace conditions."
    p_s.font.name = FONT_BODY
    p_s.font.size = Pt(17)
    p_s.font.bold = False
    p_s.font.color.rgb = COLOR_MUTED

    # Badges: LIVE  ON-DEVICE  EXPLAINABLE
    badge_y = Inches(4.85)
    badges = [("LIVE", COLOR_GREEN), ("ON-DEVICE", COLOR_CYAN), ("EXPLAINABLE", COLOR_CYAN)]
    cur_x = left_x
    for badge, color in badges:
        bw = Inches(1.65)
        bh = Inches(0.44)
        add_card_box(slide, cur_x, badge_y, bw, bh, COLOR_SURFACE, COLOR_BORDER)
        tb = slide.shapes.add_textbox(cur_x, badge_y + Inches(0.08), bw, bh)
        tf = tb.text_frame
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = f"●  {badge}"
        p.alignment = PP_ALIGN.CENTER
        p.font.name = FONT_HEADING
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = color
        cur_x += bw + Inches(0.18)

    # Right: ONE Strong Actual VERIFYX Detection Visual (Cols 6-11)
    right_x = col_x(6)
    right_w = col_w(6)
    img_path = "deck_assets_final/slide1_detection_viewport.png"
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, right_x, Inches(1.5), right_w, Inches(4.8))

    add_footer(slide, 1)
    set_speaker_notes(
        slide,
        "Welcome to VERIFYX. Traditional vision models identify objects, but cannot verify whether physical workplace conditions satisfy safety standards. VERIFYX runs on-device in the browser to deliver immediate, explainable verification verdicts without server round-trips."
    )


def build_slide_2_problem(prs):
    """Slide 2 — PROBLEM: VISUAL INSPECTION IS EASY TO MISS."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="The Problem",
        title="VISUAL INSPECTION IS EASY TO MISS.",
        subtitle="Critical spatial conditions are difficult to judge consistently."
    )

    # Left: 3 short points ONLY (Cols 0-4)
    left_x = col_x(0)
    left_w = col_w(5)
    points_y = Inches(2.4)

    points = [
        ("01", "Human visual judgement", "Subjective and prone to inspector fatigue across daily routines."),
        ("02", "Difficult spatial relationships", "Clearances and pathway boundaries cannot be judged by eye reliably."),
        ("03", "Disconnected remediation", "Issues are flagged manually without verifiable evidence of a fix.")
    ]

    for num, heading, body in points:
        add_card_box(slide, left_x, points_y, left_w, Inches(1.15), COLOR_SURFACE, COLOR_BORDER)
        tb = slide.shapes.add_textbox(left_x + Inches(0.25), points_y + Inches(0.15), left_w - Inches(0.5), Inches(0.85))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = f"{num}  ·  {heading}"
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = COLOR_WHITE

        p2 = tf.add_paragraph()
        p2.text = body
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11.5)
        p2.font.color.rgb = COLOR_MUTED

        points_y += Inches(1.35)

    # Right: ONE Strong Real Workplace Hazard Image (Cols 5-11, Zero people)
    right_x = col_x(5)
    right_w = col_w(7)
    img_path = "deck_assets_final/slide2_workplace_hazard.jpg"
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, right_x, Inches(2.35), right_w, Inches(4.15))

    add_footer(slide, 2)
    set_speaker_notes(
        slide,
        "Human visual inspection is inherently subjective. Spatial relationships like minimum clearance width cannot be judged reliably by eye, and when problems are flagged, there is no closed-loop mechanism to prove they were ever remediated."
    )


def build_slide_3_core_insight(prs):
    """Slide 3 — CORE INSIGHT: DETECTION ≠ VERIFICATION."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="Core Insight",
        title="DETECTION ≠ VERIFICATION",
        subtitle="Detecting an object is not the same as verifying compliance."
    )

    formula_y = Inches(2.7)
    node_w = Inches(2.25)
    node_h = Inches(2.0)
    op_w = Inches(0.7)

    total_w = 4 * node_w + 3 * op_w
    start_x = (Inches(SLIDE_WIDTH_IN) - total_w) / 2

    nodes = [
        ("OBJECT\nDETECTED", "YOLO11n identifies target class & location", COLOR_CYAN),
        ("+", "", COLOR_MUTED),
        ("SPATIAL\nRULE", "Bounding-box overlap & clearance math", COLOR_CYAN),
        ("+", "", COLOR_MUTED),
        ("RESCAN", "Closed-loop verification of physical fix", COLOR_CYAN),
        ("=", "", COLOR_GREEN),
        ("VERIFIED", "Structured, explainable compliance record", COLOR_GREEN),
    ]

    cur_x = start_x
    for title, desc, color in nodes:
        if desc == "":
            op_box = slide.shapes.add_textbox(cur_x, formula_y + Inches(0.5), op_w, Inches(1.0))
            tf_op = op_box.text_frame
            tf_op.margin_left = tf_op.margin_top = tf_op.margin_right = tf_op.margin_bottom = 0
            p = tf_op.paragraphs[0]
            p.text = title
            p.alignment = PP_ALIGN.CENTER
            p.font.name = FONT_HEADING
            p.font.size = Pt(36)
            p.font.bold = True
            p.font.color.rgb = color
            cur_x += op_w
        else:
            add_card_box(slide, cur_x, formula_y, node_w, node_h, COLOR_SURFACE, COLOR_BORDER)
            tb = slide.shapes.add_textbox(cur_x + Inches(0.15), formula_y + Inches(0.3), node_w - Inches(0.3), Inches(1.4))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            p1 = tf.paragraphs[0]
            p1.text = title
            p1.alignment = PP_ALIGN.CENTER
            p1.font.name = FONT_HEADING
            p1.font.size = Pt(17)
            p1.font.bold = True
            p1.font.color.rgb = color

            p2 = tf.add_paragraph()
            p2.text = desc
            p2.alignment = PP_ALIGN.CENTER
            p2.font.name = FONT_BODY
            p2.font.size = Pt(11)
            p2.font.color.rgb = COLOR_MUTED

            cur_x += node_w

    bot_y = Inches(5.4)
    b_box = slide.shapes.add_textbox(col_x(1), bot_y, col_w(10), Inches(0.6))
    tf_b = b_box.text_frame
    tf_b.word_wrap = True
    tf_b.margin_left = tf_b.margin_top = tf_b.margin_right = tf_b.margin_bottom = 0
    p_b = tf_b.paragraphs[0]
    p_b.text = "VERIFYX turns visual detection into an explainable verification workflow."
    p_b.alignment = PP_ALIGN.CENTER
    p_b.font.name = FONT_HEADING
    p_b.font.size = Pt(18)
    p_b.font.bold = True
    p_b.font.color.rgb = COLOR_WHITE

    add_footer(slide, 3)
    set_speaker_notes(
        slide,
        "Detection alone is never verification. A bounding box doesn't tell an auditor if a safety rule passed. VERIFYX combines object detection with deterministic spatial rules and a closed-loop rescan to turn raw vision into verified compliance."
    )


def build_slide_4_the_product(prs):
    """Slide 4 — THE PRODUCT: POINT. VERIFY. FIX."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="The Product",
        title="POINT. VERIFY. FIX.",
        subtitle="Real-time browser-local inspection interface."
    )

    # Left: Large Real Product Screenshot (Cols 0-7)
    left_x = col_x(0)
    left_w = col_w(8)
    img_path = "deck_assets_final/slide4_product_centered.png"
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, left_x, Inches(2.2), left_w, Inches(4.3))

    # Right: Beside it, ONLY the 4 words/short labels (Cols 8-11)
    right_x = col_x(8)
    right_w = col_w(4)
    item_y = Inches(2.2)

    labels = [
        ("LIVE SCAN", "Target scene via mobile or desktop camera", COLOR_CYAN),
        ("DETECT", "Run on-device YOLO11n ONNX inference", COLOR_WHITE),
        ("EXPLAIN", "Evaluate geometric rules and state reasons", COLOR_CYAN),
        ("RESCAN", "Confirm physical hazard removal before exit", COLOR_GREEN)
    ]

    for title, desc, col in labels:
        add_card_box(slide, right_x, item_y, right_w, Inches(0.95), COLOR_SURFACE, COLOR_BORDER)
        tb = slide.shapes.add_textbox(right_x + Inches(0.2), item_y + Inches(0.12), right_w - Inches(0.4), Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = col

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11)
        p2.font.color.rgb = COLOR_MUTED

        item_y += Inches(1.12)

    add_footer(slide, 4)
    set_speaker_notes(
        slide,
        "Here is the product interface. The operator aims the camera, VERIFYX scans the area, detects objects, checks spatial clearances against predefined safety standards, and prompts for a rescan if any remediation is required."
    )


def build_slide_5_how_it_works(prs):
    """Slide 5 — HOW IT WORKS: FROM CAMERA TO VERDICT."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="System Architecture",
        title="FROM CAMERA TO VERDICT.",
        subtitle="A 6-stage deterministic pipeline running client-side."
    )

    nodes = [
        ("CAMERA", "Capture scene", "HTML5 Video Feed"),
        ("AI DETECTION", "YOLO11n ONNX", "ONNX Runtime Web"),
        ("SPATIAL RULE", "Bounding-box geometry", "Overlap & Clearances"),
        ("VERDICT", "Explain why", "Pass, Issue, Review"),
        ("RESCAN", "Verify correction", "Closed-Loop Evidence"),
        ("REPORT", "Structured record", "Portable JSON Audit")
    ]

    pipe_y = Inches(2.6)
    node_w = Inches(1.68)
    node_h = Inches(2.4)
    arrow_w = Inches(0.22)
    start_x = col_x(0)

    cur_x = start_x
    for i, (title, short_desc, tech) in enumerate(nodes):
        card_col = COLOR_CYAN if i in [1, 2] else (COLOR_GREEN if i in [3, 4] else COLOR_WHITE)
        add_card_box(slide, cur_x, pipe_y, node_w, node_h, COLOR_SURFACE, COLOR_BORDER)

        step_tb = slide.shapes.add_textbox(cur_x + Inches(0.15), pipe_y + Inches(0.15), Inches(0.6), Inches(0.3))
        tf_step = step_tb.text_frame
        tf_step.margin_left = tf_step.margin_top = tf_step.margin_right = tf_step.margin_bottom = 0
        p_step = tf_step.paragraphs[0]
        p_step.text = f"0{i+1}"
        p_step.font.name = FONT_HEADING
        p_step.font.size = Pt(11)
        p_step.font.bold = True
        p_step.font.color.rgb = COLOR_CYAN

        tb = slide.shapes.add_textbox(cur_x + Inches(0.15), pipe_y + Inches(0.6), node_w - Inches(0.3), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = card_col

        p2 = tf.add_paragraph()
        p2.text = short_desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = COLOR_WHITE

        p3 = tf.add_paragraph()
        p3.text = tech
        p3.font.name = FONT_BODY
        p3.font.size = Pt(10)
        p3.font.color.rgb = COLOR_MUTED

        cur_x += node_w

        if i < len(nodes) - 1:
            arr_box = slide.shapes.add_textbox(cur_x, pipe_y + Inches(1.0), arrow_w, Inches(0.5))
            tf_arr = arr_box.text_frame
            tf_arr.margin_left = tf_arr.margin_top = tf_arr.margin_right = tf_arr.margin_bottom = 0
            p_arr = tf_arr.paragraphs[0]
            p_arr.text = "→"
            p_arr.alignment = PP_ALIGN.CENTER
            p_arr.font.name = FONT_HEADING
            p_arr.font.size = Pt(16)
            p_arr.font.color.rgb = COLOR_DARK_MUTED
            cur_x += arrow_w

    fn_box = slide.shapes.add_textbox(col_x(0), Inches(5.6), col_w(12), Inches(0.5))
    tf_fn = fn_box.text_frame
    tf_fn.word_wrap = True
    tf_fn.margin_left = tf_fn.margin_top = tf_fn.margin_right = tf_fn.margin_bottom = 0
    p_fn = tf_fn.paragraphs[0]
    p_fn.text = "Camera frames are processed locally in the browser; they are not transmitted to external servers."
    p_fn.alignment = PP_ALIGN.CENTER
    p_fn.font.name = FONT_BODY
    p_fn.font.size = Pt(12)
    p_fn.font.color.rgb = COLOR_MUTED

    add_footer(slide, 5)
    set_speaker_notes(
        slide,
        "The architecture consists of six sequential stages. Video frames are captured by the browser, fed to an on-device YOLO11n ONNX model via WebAssembly, evaluated against geometric rules, explained in human terms, re-verified upon fix, and stored as structured JSON."
    )


def build_slide_6_real_verification(prs):
    """Slide 6 — REAL VERIFICATION: SEE IT. FIX IT. VERIFY IT."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="Closed-Loop Verification",
        title="SEE IT. FIX IT. VERIFY IT.",
        subtitle="Actual dataset detection evidence compared against clearance verification."
    )

    box_y = Inches(2.2)
    img_dim = Inches(3.6)

    # Left: BEFORE (Cols 1-5)
    b_left = col_x(1)
    b_w = col_w(5)

    lbl_b = slide.shapes.add_textbox(b_left, box_y, b_w, Inches(0.35))
    tf_lb = lbl_b.text_frame
    tf_lb.margin_left = tf_lb.margin_top = tf_lb.margin_right = tf_lb.margin_bottom = 0
    p_lb = tf_lb.paragraphs[0]
    p_lb.text = "BEFORE  ·  OBSTRUCTION DETECTED"
    p_lb.font.name = FONT_HEADING
    p_lb.font.size = Pt(13)
    p_lb.font.bold = True
    p_lb.font.color.rgb = COLOR_RED

    img_before = "deck_assets_final/slide6_before_box_clean.jpg"
    if os.path.exists(img_before):
        slide.shapes.add_picture(img_before, b_left, box_y + Inches(0.4), img_dim, img_dim)

    # Right: AFTER (Cols 7-11)
    a_left = col_x(7)
    a_w = col_w(5)

    lbl_a = slide.shapes.add_textbox(a_left, box_y, a_w, Inches(0.35))
    tf_la = lbl_a.text_frame
    tf_la.margin_left = tf_la.margin_top = tf_la.margin_right = tf_la.margin_bottom = 0
    p_la = tf_la.paragraphs[0]
    p_la.text = "AFTER  ·  RESCAN VERIFIED"
    p_la.font.name = FONT_HEADING
    p_la.font.size = Pt(13)
    p_la.font.bold = True
    p_la.font.color.rgb = COLOR_GREEN

    # Clean indoor corridor/doorway (100% human-free)
    img_after = "deck_assets_final/slide6_after_corridor_clean.jpg"
    if os.path.exists(img_after):
        slide.shapes.add_picture(img_after, a_left, box_y + Inches(0.4), img_dim, img_dim)

    # Center Transition Arrow
    c_arrow = slide.shapes.add_textbox(col_x(5) + Inches(0.3), box_y + Inches(1.8), Inches(1.0), Inches(0.6))
    tf_ca = c_arrow.text_frame
    tf_ca.margin_left = tf_ca.margin_top = tf_ca.margin_right = tf_ca.margin_bottom = 0
    p_ca = tf_ca.paragraphs[0]
    p_ca.text = "→"
    p_ca.alignment = PP_ALIGN.CENTER
    p_ca.font.name = FONT_HEADING
    p_ca.font.size = Pt(36)
    p_ca.font.bold = True
    p_ca.font.color.rgb = COLOR_MUTED

    # Bottom Result Badge
    res_y = Inches(6.3)
    res_box = slide.shapes.add_textbox(col_x(2), res_y, col_w(8), Inches(0.4))
    tf_res = res_box.text_frame
    tf_res.word_wrap = True
    tf_res.margin_left = tf_res.margin_top = tf_res.margin_right = tf_res.margin_bottom = 0
    p_res = tf_res.paragraphs[0]
    p_res.text = "POSSIBLE OBSTRUCTION  →  CLEARANCE VERIFIED"
    p_res.alignment = PP_ALIGN.CENTER
    p_res.font.name = FONT_HEADING
    p_res.font.size = Pt(15)
    p_res.font.bold = True
    p_res.font.color.rgb = COLOR_WHITE

    add_footer(slide, 6)
    set_speaker_notes(
        slide,
        "This slide proves the core workflow with real test evaluation data. On the left, an obstruction box is detected blocking the pathway. On the right, following physical relocation, the rescan confirms the zone is clear, creating verifiable evidence."
    )


def build_slide_7_why_verifyx(prs):
    """Slide 7 — WHY VERIFYX: NOT JUST A DETECTION."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="Competitive Advantage",
        title="NOT JUST A DETECTION.",
        subtitle="A fundamental shift from subjective observation to deterministic verification."
    )

    card_y = Inches(2.3)
    card_w = col_w(5.8)
    card_h = Inches(4.1)

    # Column 1: TRADITIONAL (Cols 0-5)
    c1_x = col_x(0)
    add_card_box(slide, c1_x, card_y, card_w, card_h, COLOR_SURFACE, COLOR_BORDER)

    tb1 = slide.shapes.add_textbox(c1_x + Inches(0.4), card_y + Inches(0.35), card_w - Inches(0.8), card_h - Inches(0.7))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    p_t1 = tf1.paragraphs[0]
    p_t1.text = "TRADITIONAL"
    p_t1.font.name = FONT_HEADING
    p_t1.font.size = Pt(20)
    p_t1.font.bold = True
    p_t1.font.color.rgb = COLOR_MUTED

    trad_points = [
        "Human visual judgement",
        "Subjective reasoning",
        "Manual remediation",
        "Fragmented evidence"
    ]
    for pt in trad_points:
        p = tf1.add_paragraph()
        p.text = f"✕  {pt}"
        p.space_before = Pt(18)
        p.font.name = FONT_BODY
        p.font.size = Pt(15)
        p.font.color.rgb = COLOR_MUTED

    # Column 2: VERIFYX (Cols 6-11)
    c2_x = col_x(6.2)
    add_card_box(slide, c2_x, card_y, card_w, card_h, COLOR_SURFACE, COLOR_CYAN)

    tb2 = slide.shapes.add_textbox(c2_x + Inches(0.4), card_y + Inches(0.35), card_w - Inches(0.8), card_h - Inches(0.7))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    p_t2 = tf2.paragraphs[0]
    p_t2.text = "VERIFYX"
    p_t2.font.name = FONT_HEADING
    p_t2.font.size = Pt(20)
    p_t2.font.bold = True
    p_t2.font.color.rgb = COLOR_CYAN

    vx_points = [
        "AI detection",
        "Spatial reasoning",
        "Before/After rescan",
        "Structured evidence"
    ]
    for pt in vx_points:
        p = tf2.add_paragraph()
        p.text = f"✓  {pt}"
        p.space_before = Pt(18)
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = COLOR_WHITE

    add_footer(slide, 7)
    set_speaker_notes(
        slide,
        "Traditional facility audits rely on human checklists, subjective opinions, and fragmented paper trails. VERIFYX replaces this with automated AI perception, geometric spatial rules, a mandatory Before/After rescan, and exportable digital proof."
    )


def build_slide_8_proof(prs):
    """Slide 8 — PROOF: BUILT. TESTED. DEPLOYED."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="Verified Execution",
        title="BUILT. TESTED. DEPLOYED.",
        subtitle="Fully verified implementation running on production infrastructure."
    )

    # Dominant Visual: 24 / 24
    dom_y = Inches(2.3)
    dom_box = slide.shapes.add_textbox(col_x(0), dom_y, col_w(12), Inches(1.3))
    tf_dom = dom_box.text_frame
    tf_dom.margin_left = tf_dom.margin_top = tf_dom.margin_right = tf_dom.margin_bottom = 0
    p_dom = tf_dom.paragraphs[0]
    p_dom.text = "24 / 24"
    p_dom.alignment = PP_ALIGN.CENTER
    p_dom.font.name = FONT_HEADING
    p_dom.font.size = Pt(80)
    p_dom.font.bold = True
    p_dom.font.color.rgb = COLOR_CYAN

    # Below Dominant Visual: Test Breakdown
    sub_dom_y = Inches(3.7)
    sub_box = slide.shapes.add_textbox(col_x(0), sub_dom_y, col_w(12), Inches(0.45))
    tf_sub = sub_box.text_frame
    tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "13 Spatial Rule Tests    ·    11 Report Lifecycle Tests"
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.font.name = FONT_HEADING
    p_sub.font.size = Pt(18)
    p_sub.font.bold = True
    p_sub.font.color.rgb = COLOR_WHITE

    # Compact Proof Row: BUILD ✓  MOBILE ✓  DESKTOP ✓  LIVE ✓  RESCAN ✓  REPORT ✓
    proof_y = Inches(4.6)
    proof_items = [
        "BUILD ✓", "MOBILE ✓", "DESKTOP ✓", "LIVE ✓", "RESCAN ✓", "REPORT ✓"
    ]
    item_w = Inches(1.7)
    item_h = Inches(0.5)
    row_total_w = len(proof_items) * item_w + (len(proof_items) - 1) * Inches(0.18)
    cur_x = (Inches(SLIDE_WIDTH_IN) - row_total_w) / 2

    for item in proof_items:
        add_card_box(slide, cur_x, proof_y, item_w, item_h, COLOR_SURFACE, COLOR_BORDER)
        tb = slide.shapes.add_textbox(cur_x, proof_y + Inches(0.1), item_w, item_h)
        tf = tb.text_frame
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = item
        p.alignment = PP_ALIGN.CENTER
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = COLOR_GREEN
        cur_x += item_w + Inches(0.18)

    # Bottom Metadata
    bot_y = Inches(5.6)
    meta_box = slide.shapes.add_textbox(col_x(0), bot_y, col_w(12), Inches(0.5))
    tf_meta = meta_box.text_frame
    tf_meta.margin_left = tf_meta.margin_top = tf_meta.margin_right = tf_meta.margin_bottom = 0
    p_meta = tf_meta.paragraphs[0]
    p_meta.text = "Git Commit: afb0952    ·    verifyx-gray.vercel.app"
    p_meta.alignment = PP_ALIGN.CENTER
    p_meta.font.name = FONT_BODY
    p_meta.font.size = Pt(13)
    p_meta.font.color.rgb = COLOR_MUTED

    add_footer(slide, 8)
    set_speaker_notes(
        slide,
        "VERIFYX is not a mock concept. All 24 automated unit tests pass, covering 13 spatial rule edge cases and 11 report lifecycle states. The web application is built, verified across mobile and desktop devices, and running live on Vercel at commit afb0952."
    )


def build_slide_9_future(prs):
    """Slide 9 — FUTURE: THE VERIFICATION LAYER CAN GROW."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    add_header(
        slide,
        kicker="Roadmap",
        title="THE VERIFICATION LAYER CAN GROW.",
        subtitle="A clear distinction between what is implemented and what comes next."
    )

    cols_data = [
        ("TODAY", "Working verification engine", [
            "YOLO11n ONNX in browser",
            "5 spatial safety rules",
            "Closed-loop rescan flow",
            "Structured JSON export"
        ], COLOR_CYAN),
        ("NEXT", "Custom rules, APIs, Integrations", [
            "User-defined rule schema",
            "REST & Webhook push APIs",
            "Facility management export",
            "Batch multi-item audit"
        ], COLOR_WHITE),
        ("FUTURE", "Tamper-evident records, Multi-camera workflows", [
            "Cryptographic audit logs",
            "Multi-camera sync",
            "Automated work order trigger",
            "Spatial digital twin mapping"
        ], COLOR_MUTED)
    ]

    col_y = Inches(2.3)
    col_w_in = col_w(3.8)

    for i, (stage, desc, items, color) in enumerate(cols_data):
        cx = col_x(i * 4)
        add_card_box(slide, cx, col_y, col_w_in, Inches(3.8), COLOR_SURFACE, COLOR_BORDER)

        tb = slide.shapes.add_textbox(cx + Inches(0.3), col_y + Inches(0.3), col_w_in - Inches(0.6), Inches(3.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = stage
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(18)
        p1.font.bold = True
        p1.font.color.rgb = color

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.space_before = Pt(4)
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11)
        p2.font.color.rgb = COLOR_CYAN if stage == "TODAY" else COLOR_MUTED

        for it in items:
            p_it = tf.add_paragraph()
            p_it.text = f"•  {it}"
            p_it.space_before = Pt(10)
            p_it.font.name = FONT_BODY
            p_it.font.size = Pt(12)
            p_it.font.color.rgb = COLOR_WHITE if stage == "TODAY" else COLOR_MUTED

    disc_y = Inches(6.3)
    disc_box = slide.shapes.add_textbox(col_x(0), disc_y, col_w(12), Inches(0.35))
    tf_d = disc_box.text_frame
    tf_d.word_wrap = True
    tf_d.margin_left = tf_d.margin_top = tf_d.margin_right = tf_d.margin_bottom = 0
    p_d = tf_d.paragraphs[0]
    p_d.text = "Prototype verification rule engine — not a certified safety compliance system."
    p_d.alignment = PP_ALIGN.CENTER
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(10.5)
    p_d.font.color.rgb = COLOR_DARK_MUTED

    add_footer(slide, 9)
    set_speaker_notes(
        slide,
        "We have established clear architectural boundaries. Today we have a functional client-side engine with five rules. Next, we will introduce custom rule APIs and webhook notifications. In the future, we aim to support continuous multi-camera verification."
    )


def build_slide_10_close(prs):
    """Slide 10 — CLOSE: DON'T JUST TRUST IT. VERIFY IT."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    # Left: Clean, uncrowded, perfectly spaced call to action (Cols 0-6)
    left_x = col_x(0)
    left_w = col_w(7)

    k_box = slide.shapes.add_textbox(left_x, Inches(1.8), left_w, Inches(0.35))
    tf_k = k_box.text_frame
    tf_k.margin_left = tf_k.margin_top = tf_k.margin_right = tf_k.margin_bottom = 0
    p_k = tf_k.paragraphs[0]
    p_k.text = "THE NEW STANDARD IN FACILITY AUDITS"
    p_k.font.name = FONT_HEADING
    p_k.font.size = Pt(12)
    p_k.font.bold = True
    p_k.font.color.rgb = COLOR_CYAN

    # Main Headline (Two clean lines)
    h_box = slide.shapes.add_textbox(left_x, Inches(2.2), left_w + Inches(0.5), Inches(1.3))
    tf_h = h_box.text_frame
    tf_h.word_wrap = True
    tf_h.margin_left = tf_h.margin_top = tf_h.margin_right = tf_h.margin_bottom = 0
    p_h = tf_h.paragraphs[0]
    p_h.text = "DON'T JUST TRUST IT.\nVERIFY IT."
    p_h.font.name = FONT_HEADING
    p_h.font.size = Pt(40)
    p_h.font.bold = True
    p_h.font.color.rgb = COLOR_WHITE

    # Badge: Built • Tested • Deployed
    s_box = slide.shapes.add_textbox(left_x, Inches(3.8), left_w, Inches(0.4))
    tf_s = s_box.text_frame
    tf_s.word_wrap = True
    tf_s.margin_left = tf_s.margin_top = tf_s.margin_right = tf_s.margin_bottom = 0
    p_s = tf_s.paragraphs[0]
    p_s.text = "Built • Tested • Deployed"
    p_s.font.name = FONT_HEADING
    p_s.font.size = Pt(16)
    p_s.font.bold = True
    p_s.font.color.rgb = COLOR_GREEN

    # URL Display
    u_box = slide.shapes.add_textbox(left_x, Inches(4.5), left_w, Inches(0.45))
    tf_u = u_box.text_frame
    tf_u.word_wrap = True
    tf_u.margin_left = tf_u.margin_top = tf_u.margin_right = tf_u.margin_bottom = 0
    p_u = tf_u.paragraphs[0]
    p_u.text = "https://verifyx-gray.vercel.app/"
    p_u.font.name = FONT_HEADING
    p_u.font.size = Pt(17)
    p_u.font.bold = True
    p_u.font.color.rgb = COLOR_CYAN

    # Sub-caption
    c_box = slide.shapes.add_textbox(left_x, Inches(5.1), left_w, Inches(0.4))
    tf_c = c_box.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
    p_c = tf_c.paragraphs[0]
    p_c.text = "Deterministic AI visual verification running client-side."
    p_c.font.name = FONT_BODY
    p_c.font.size = Pt(13)
    p_c.font.color.rgb = COLOR_MUTED

    # Right: Clean QR Code (Cols 8-11)
    right_x = col_x(8)
    right_w = col_w(4)
    add_card_box(slide, right_x, Inches(1.8), right_w, Inches(4.4), COLOR_SURFACE, COLOR_BORDER)

    qr_path = "deck_assets_final/verifyx_qr.png"
    qr_dim = Inches(2.6)
    qr_x = right_x + (right_w - qr_dim) / 2
    if os.path.exists(qr_path):
        slide.shapes.add_picture(qr_path, qr_x, Inches(2.2), qr_dim, qr_dim)

    # Text under QR
    lbl_box = slide.shapes.add_textbox(right_x, Inches(5.1), right_w, Inches(0.8))
    tf_lbl = lbl_box.text_frame
    tf_lbl.word_wrap = True
    tf_lbl.margin_left = tf_lbl.margin_top = tf_lbl.margin_right = tf_lbl.margin_bottom = 0
    p_l1 = tf_lbl.paragraphs[0]
    p_l1.text = "verifyx-gray.vercel.app"
    p_l1.alignment = PP_ALIGN.CENTER
    p_l1.font.name = FONT_HEADING
    p_l1.font.size = Pt(13)
    p_l1.font.bold = True
    p_l1.font.color.rgb = COLOR_WHITE

    p_l2 = tf_lbl.add_paragraph()
    p_l2.text = "Scan with your phone to test live"
    p_l2.alignment = PP_ALIGN.CENTER
    p_l2.font.name = FONT_BODY
    p_l2.font.size = Pt(11)
    p_l2.font.color.rgb = COLOR_MUTED

    add_footer(slide, 10)
    set_speaker_notes(
        slide,
        "Don't take our word for it—verify it yourself. Please scan the QR code to experience VERIFYX running live on your mobile device right now. Thank you, and we're ready for your questions."
    )


# ─── MAIN BUILD EXECUTION ─────────────────────────────────────────────────────

def main():
    print("Generating refined visual-first pitch deck verifyx_pitch_deck_final.pptx...")
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_WIDTH_IN)
    prs.slide_height = Inches(SLIDE_HEIGHT_IN)

    build_slide_1_hero(prs)
    build_slide_2_problem(prs)
    build_slide_3_core_insight(prs)
    build_slide_4_the_product(prs)
    build_slide_5_how_it_works(prs)
    build_slide_6_real_verification(prs)
    build_slide_7_why_verifyx(prs)
    build_slide_8_proof(prs)
    build_slide_9_future(prs)
    build_slide_10_close(prs)

    output_pptx = "verifyx_pitch_deck_final.pptx"
    prs.save(output_pptx)
    print(f"Refined presentation saved successfully to {output_pptx}!")

if __name__ == "__main__":
    main()
