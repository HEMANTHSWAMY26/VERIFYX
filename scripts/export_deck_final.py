"""
Export verifyx_pitch_deck_final.pptx to PDF and high-resolution PNG slide previews.
"""

import os
import sys
import win32com.client

def export_deck():
    cwd = os.getcwd()
    pptx_path = os.path.abspath(os.path.join(cwd, "verifyx_pitch_deck_final.pptx"))
    pdf_path = os.path.abspath(os.path.join(cwd, "verifyx_pitch_deck_final.pdf"))
    previews_dir = os.path.abspath(os.path.join(cwd, "slide_previews_final"))

    os.makedirs(previews_dir, exist_ok=True)

    if not os.path.exists(pptx_path):
        print(f"Error: {pptx_path} not found.")
        sys.exit(1)

    print(f"Opening PowerPoint to export: {pptx_path}")
    powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    # Open presentation (Read-only, without window if possible)
    deck = powerpoint.Presentations.Open(pptx_path, WithWindow=False)

    try:
        # 1. Save as PDF (FormatType 32 = ppSaveAsPDF)
        print(f"Exporting PDF to: {pdf_path}")
        deck.SaveAs(pdf_path, 32)
        print("PDF export completed.")

        # 2. Export each slide to 1920x1080 PNG
        total_slides = deck.Slides.Count
        print(f"Exporting {total_slides} slides to PNG previews in {previews_dir}...")
        for i in range(1, total_slides + 1):
            slide = deck.Slides(i)
            png_path = os.path.join(previews_dir, f"slide_{i:02d}.png")
            slide.Export(png_path, "PNG", 1920, 1080)
            print(f"Exported Slide {i:02d}: {png_path}")

    finally:
        deck.Close()
        powerpoint.Quit()
        print("PowerPoint process closed.")

if __name__ == "__main__":
    export_deck()
