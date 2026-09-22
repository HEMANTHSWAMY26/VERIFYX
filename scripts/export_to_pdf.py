import os
import win32com.client

pptx_path = os.path.abspath("c:/Users/heman/OneDrive/Desktop/VERIFYX/verifyx_pitch_deck.pptx")
pdf_path = os.path.abspath("c:/Users/heman/OneDrive/Desktop/VERIFYX/verifyx_pitch_deck.pdf")

print(f"Converting {pptx_path} to {pdf_path} via PowerPoint...")

try:
    ppt = win32com.client.Dispatch("PowerPoint.Application")
    # Open presentation without opening window if possible, or read-only
    deck = ppt.Presentations.Open(pptx_path, WithWindow=False)
    # FormatType 32 is ppSaveAsPDF
    deck.SaveAs(pdf_path, 32)
    deck.Close()
    ppt.Quit()
    print(f"Exported PDF successfully: {pdf_path}")
except Exception as e:
    print(f"PowerPoint PDF export failed: {e}")
