#!/usr/bin/env python3

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime
import re

def create_medical_pdf():
    # Create PDF document
    doc = SimpleDocTemplate(
        "ameliyat_raporu.pdf",
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.darkblue
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.darkblue
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=12,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    # Story list to hold all elements
    story = []
    
    # Title and header
    story.append(Paragraph("Ameliyat Sonrası İyileşme Takip Raporu", title_style))
    story.append(Paragraph("Hava Şahin - Günlük Tahlil Sonuçları", subtitle_style))
    story.append(Spacer(1, 20))
    
    # Doctor's commentary
    story.append(Paragraph("Doktor Yorumu", heading_style))
    
    commentary_text = """
    Tahlil sonuçları, ameliyat sonrası iyileşme sürecinin beklenen şekilde ilerlediğini gösteriyor. 
    En önemli bulgulardan biri, yüksek seyreden enfeksiyon belirteci olan <b>CRP</b> değerinin giderek 
    normale dönmesidir. Bu durum, vücudun iltihaplanma sürecini kontrol altına aldığını ve enfeksiyon 
    riskinin azaldığını gösterir.
    <br/><br/>
    Kan sayımı parametrelerinde de benzer olumlu bir seyir izlenmektedir. Ameliyat sonrası yükselen 
    <b>WBC</b> ve <b>Nötrofil</b> değerleri düşüşe geçmiştir. Bu, bağışıklık sisteminin normale 
    döndüğünü teyit eder.
    <br/><br/>
    Diğer önemli parametrelerden biri olan kan şekeri (<b>Glukoz</b>) seviyesi de süreç içinde düşüş 
    eğilimindedir, bu da ameliyat stresinin azaldığına işaret eder.
    <br/><br/>
    Ancak, <b>Potasyum</b> seviyesinin sınırda düşük seyretmesi takip edilmelidir. Elektrolit dengesinin 
    korunması iyileşme için önemlidir. Genel olarak, tüm parametreler olumlu bir trend izlemekte ve 
    hastanın iyileşme sürecinin başarılı bir şekilde ilerlediğini göstermektedir.
    """
    
    story.append(Paragraph(commentary_text, body_style))
    story.append(Spacer(1, 20))
    
    # Key parameters trend analysis
    story.append(Paragraph("Ana Parametreler Trend Analizi", heading_style))
    
    # Create table data for key parameters
    key_data = [
        ['Parametre', '18 Eylül', '19 Eylül', '20 Eylül', '21 Eylül', 'Referans', 'Durum'],
        ['CRP (mg/dl)', '3.04', '2.17', '0.47', '0.246', '0-0.5', 'İyileşme'],
        ['WBC (x10³/μL)', '14.30', '15.47', '9.62', '6.46', '4-10', 'İyileşme'],
        ['Nötrofil (x10³/μL)', '13.31', '13.99', '8.06', '5.12', '2-7', 'İyileşme'],
        ['Glukoz (mg/dl)', '174', '168', '169', '151', '70-110', 'İyileşme'],
        ['Potasyum (mmol/L)', '3.42', '3.12', '3.09', '3.48', '3.50-5.20', 'Takip'],
        ['HCT (%)', '37.8', '35.4', '32.9', '35.4', '37-47', 'Düşük']
    ]
    
    # Create table
    key_table = Table(key_data, colWidths=[3*cm, 2*cm, 2*cm, 2*cm, 2*cm, 2.5*cm, 2*cm])
    key_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Color coding for status
        ('TEXTCOLOR', (-1, 1), (-1, 4), colors.green),  # İyileşme - green
        ('TEXTCOLOR', (-1, 5), (-1, 5), colors.orange), # Takip - orange
        ('TEXTCOLOR', (-1, 6), (-1, 6), colors.red),    # Düşük - red
    ]))
    
    story.append(key_table)
    story.append(Spacer(1, 20))
    
    # Add page break before detailed data
    story.append(PageBreak())
    
    # Detailed daily data
    story.append(Paragraph("Detaylı Günlük Parametre Tablosu", heading_style))
    
    # All parameters data
    all_data = [
        ['Parametre', '18 Eylül', '19 Eylül', '20 Eylül', '21 Eylül', 'Referans'],
        ['WBC (x10³/μL)', '14.30', '15.47', '9.62', '6.46', '4-10'],
        ['Nötrofil (x10³/μL)', '13.31', '13.99', '8.06', '5.12', '2-7'],
        ['Lenfosit (x10³/μL)', '0.69', '1.04', '1.27', '1.12', '0.8-4'],
        ['Monosit (x10³/μL)', '0.30', '0.41', '0.29', '0.22', '0.12-1.2'],
        ['RBC (x10⁶/μL)', '4.37', '4.02', '3.74', '4.07', '3.5-6.13'],
        ['HGB (g/dl)', '13.3', '12.2', '11.4', '12.4', '11-16'],
        ['HCT (%)', '37.8', '35.4', '32.9', '35.4', '37-47'],
        ['MCV (fl)', '86.5', '88.0', '87.9', '86.8', '80-100'],
        ['PLT (x10³/μL)', '251', '216', '191', '188', '150-400'],
        ['Glukoz (mg/dl)', '174', '168', '169', '151', '70-110'],
        ['Kreatinin (mg/dl)', '0.86', '0.91', '0.69', '0.79', '0.60-1.10'],
        ['Kalsiyum (mg/dl)', '8.1', '8.7', '7.7', '8.9', '8.1-10.7'],
        ['Potasyum (mmol/L)', '3.42', '3.12', '3.09', '3.48', '3.50-5.20'],
        ['Sodyum (mmol/L)', '143', '145', '141', '137', '134-148'],
        ['CRP (mg/dl)', '3.04', '2.17', '0.47', '0.246', '0-0.5'],
        ['ALT (U/L)', '23', '26', '25', '27', '0-35'],
        ['AST (U/L)', '27', '28', '14', '15', '0-35'],
        ['Üre (mg/dl)', '9.4', '14.3', '13.4', '16.3', '8.2-23.2']
    ]
    
    # Create detailed table with smaller font
    detail_table = Table(all_data, colWidths=[4*cm, 2.2*cm, 2.2*cm, 2.2*cm, 2.2*cm, 2.5*cm])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Alternate row colors
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 3), (-1, 3), colors.white),
        ('BACKGROUND', (0, 5), (-1, 5), colors.white),
        ('BACKGROUND', (0, 7), (-1, 7), colors.white),
        ('BACKGROUND', (0, 9), (-1, 9), colors.white),
        ('BACKGROUND', (0, 11), (-1, 11), colors.white),
        ('BACKGROUND', (0, 13), (-1, 13), colors.white),
        ('BACKGROUND', (0, 15), (-1, 15), colors.white),
        ('BACKGROUND', (0, 17), (-1, 17), colors.white),
    ]))
    
    story.append(detail_table)
    story.append(Spacer(1, 30))
    
    # Summary and recommendations
    story.append(Paragraph("Özet ve Öneriler", heading_style))
    
    summary_text = """
    <b>Genel Durum:</b> Ameliyat sonrası iyileşme süreci başarılı bir şekilde ilerlemektedir.
    <br/><br/>
    <b>Olumlu Gelişmeler:</b>
    <br/>• CRP değeri 3.04'ten 0.246'ya düşerek normal aralığa girmiştir
    <br/>• WBC sayısı 14.30'dan 6.46'ya düşerek normal aralığa girmiştir  
    <br/>• Nötrofil değeri 13.31'den 5.12'ye düşerek normal aralığa girmiştir
    <br/>• Glukoz seviyesi düşüş eğilimindedir (174'ten 151'e)
    <br/><br/>
    <b>Takip Edilmesi Gerekenler:</b>
    <br/>• Potasyum seviyesi hala düşük seyretmektedir (3.48 mmol/L)
    <br/>• HCT değeri referans aralığının altındadır
    <br/><br/>
    <b>Öneriler:</b>
    <br/>• Potasyum içeriği yüksek gıdalar tüketilmesi
    <br/>• Demir içeriği yüksek gıdalarla beslenme
    <br/>• Düzenli kontrol tahlilleri yapılması
    """
    
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 20))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    story.append(Spacer(1, 30))
    story.append(Paragraph(f"Bu rapor {datetime.now().strftime('%d.%m.%Y %H:%M')} tarihinde oluşturulmuştur.", footer_style))
    
    # Build PDF
    doc.build(story)
    
    print("PDF raporu başarıyla oluşturuldu: ameliyat_raporu.pdf")
    print("Dosya boyutu ve içeriği kontrol edilebilir.")

if __name__ == "__main__":
    create_medical_pdf()