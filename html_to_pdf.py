#!/usr/bin/env python3
"""
HTML to PDF Converter using Playwright
Converts the medical report HTML to a high-quality PDF
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def convert_html_to_pdf():
    """Convert HTML file to PDF using Playwright"""
    
    # File paths
    html_file = "/workspace/ameliyat_raporu.html"
    pdf_file = "/workspace/ameliyat_raporu.pdf"
    
    # Check if HTML file exists
    if not os.path.exists(html_file):
        print(f"Error: HTML file not found at {html_file}")
        return False
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Set viewport for consistent rendering
        await page.set_viewport_size({"width": 1200, "height": 800})
        
        # Load the HTML file
        html_path = f"file://{html_file}"
        print(f"Loading HTML from: {html_path}")
        
        try:
            await page.goto(html_path, wait_until="networkidle")
            
            # Wait for charts to render (Chart.js needs time to draw)
            print("Waiting for charts to render...")
            await page.wait_for_timeout(3000)  # Wait 3 seconds for charts
            
            # Wait for table to be populated
            await page.wait_for_selector("tbody tr", timeout=10000)
            print("Table populated successfully")
            
            # Generate PDF with high quality settings
            print("Generating PDF...")
            await page.pdf(
                path=pdf_file,
                format="A4",
                print_background=True,
                margin={
                    "top": "1cm",
                    "right": "1cm", 
                    "bottom": "1cm",
                    "left": "1cm"
                },
                prefer_css_page_size=True,
                display_header_footer=False
            )
            
            print(f"PDF successfully created: {pdf_file}")
            
        except Exception as e:
            print(f"Error during conversion: {str(e)}")
            return False
            
        finally:
            await browser.close()
    
    return True

def main():
    """Main function"""
    print("Starting HTML to PDF conversion...")
    
    # Check if Playwright is installed
    try:
        import playwright
        print("Playwright is available")
    except ImportError:
        print("Error: Playwright is not installed.")
        print("Please install it with: pip install playwright")
        print("Then install browsers with: playwright install")
        return
    
    # Run the conversion
    success = asyncio.run(convert_html_to_pdf())
    
    if success:
        print("Conversion completed successfully!")
        print(f"PDF file saved as: /workspace/ameliyat_raporu.pdf")
    else:
        print("Conversion failed!")

if __name__ == "__main__":
    main()