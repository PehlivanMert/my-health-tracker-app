#!/usr/bin/env python3
"""
Simple HTML to PDF Converter using WeasyPrint
Converts the medical report HTML to a high-quality PDF
"""

import os
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

def convert_html_to_pdf():
    """Convert HTML file to PDF using WeasyPrint"""
    
    # File paths
    html_file = "/workspace/ameliyat_raporu.html"
    pdf_file = "/workspace/ameliyat_raporu.pdf"
    
    # Check if HTML file exists
    if not os.path.exists(html_file):
        print(f"Error: HTML file not found at {html_file}")
        return False
    
    try:
        print("Starting HTML to PDF conversion with WeasyPrint...")
        
        # Read the HTML content
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Create font configuration
        font_config = FontConfiguration()
        
        # Additional CSS for better PDF rendering
        additional_css = CSS(string='''
            @page {
                size: A4;
                margin: 1cm;
            }
            
            body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
            }
            
            .chart-container {
                height: 300px !important;
                margin: 20px 0;
            }
            
            canvas {
                max-width: 100%;
                height: auto;
            }
            
            table {
                font-size: 12px;
                border-collapse: collapse;
                width: 100%;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            
            th {
                background-color: #f5f5f5;
                font-weight: bold;
            }
            
            .card {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            
            .grid {
                display: block;
            }
            
            .grid > div {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            
            /* Hide JavaScript-generated content that might not render properly */
            canvas {
                border: 1px solid #ccc;
                background-color: #f9f9f9;
            }
        ''', font_config=font_config)
        
        # Convert HTML to PDF
        html_doc = HTML(string=html_content, base_url=os.path.dirname(html_file))
        html_doc.write_pdf(pdf_file, stylesheets=[additional_css], font_config=font_config)
        
        print(f"PDF successfully created: {pdf_file}")
        return True
        
    except Exception as e:
        print(f"Error during conversion: {str(e)}")
        return False

def main():
    """Main function"""
    print("Starting HTML to PDF conversion...")
    
    # Check if WeasyPrint is available
    try:
        import weasyprint
        print("WeasyPrint is available")
    except ImportError:
        print("Error: WeasyPrint is not installed.")
        print("Please install it with: pip install weasyprint")
        return
    
    # Run the conversion
    success = convert_html_to_pdf()
    
    if success:
        print("Conversion completed successfully!")
        print(f"PDF file saved as: /workspace/ameliyat_raporu.pdf")
        
        # Check file size
        if os.path.exists("/workspace/ameliyat_raporu.pdf"):
            size = os.path.getsize("/workspace/ameliyat_raporu.pdf")
            print(f"PDF file size: {size:,} bytes ({size/1024:.1f} KB)")
    else:
        print("Conversion failed!")

if __name__ == "__main__":
    main()