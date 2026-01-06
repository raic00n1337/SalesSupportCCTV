import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Project, Site, BOMItem } from './types'
import type { NetworkDevice } from './ipHelper'

interface PDFExportOptions {
  project: Project
  bom: BOMItem[]
  ipDocumentation?: {
    siteId: string
    siteName: string
    devices: NetworkDevice[]
    gateway?: string
    cidr?: string
  }[]
}

export const generatePDF = (options: PDFExportOptions) => {
  const { project, bom, ipDocumentation } = options
  const doc = new jsPDF()
  
  let yPosition = 20

  // === LOGO & HEADER ===
  // Securitas Technology Logo (drei rote Kreise)
  const circleY = 15
  doc.setFillColor(227, 30, 36) // #E31E24
  doc.circle(15, circleY, 3, 'F')
  doc.circle(22, circleY, 3, 'F')
  doc.circle(29, circleY, 3, 'F')
  
  // Securitas Technology Text
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 61, 92) // #003D5C
  doc.text('Securitas Technology', 35, 14)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Video-System-Konfigurator', 35, 19)

  // Linie unter Header
  doc.setDrawColor(200, 200, 200)
  doc.line(15, 25, 195, 25)

  yPosition = 35

  // === PROJEKT-INFORMATIONEN ===
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Angebot: ' + (project.name || 'Unbenanntes Projekt'), 15, yPosition)
  
  yPosition += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const projectInfo = [
    ['Paket:', project.tier || '-'],
    ['Hersteller:', project.manufacturer || '-'],
    ['Video-Management:', project.videoManagement === 'nvr' ? 'NVR' : 'VMS'],
    ['Speicherdauer:', `${project.storageDays || 0} Tage`],
    ['USV:', project.upsRequired ? 'Ja' : 'Nein'],
    ['Remote-Fähigkeit:', project.remoteCapable ? 'Ja' : 'Nein'],
    ['Anzahl Standorte:', project.sites?.length.toString() || '0']
  ]

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: projectInfo,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 15 }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // === STÜCKLISTE ===
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Stückliste / Bill of Materials', 15, yPosition)
  
  yPosition += 5

  // Gruppiere BOM nach Kategorie
  const bomByCategory = bom.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, BOMItem[]>)

  const categories = Object.keys(bomByCategory)
  
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]
    const items = bomByCategory[category]

    // Neue Seite wenn nötig
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    // Kategorie-Überschrift
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(141, 95, 255) // Primary Color #8D5FFF
    doc.rect(15, yPosition, 180, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(category, 17, yPosition + 5)
    
    yPosition += 10

    // Tabelle für diese Kategorie
    const tableData = items.map(item => [
      item.articleName,
      item.esoArticleNumber || '-',
      item.quantity.toString(),
      'Stk.',
      `${item.unitPrice.toFixed(2)} €`,
      `${(item.quantity * item.unitPrice).toFixed(2)} €`
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Bezeichnung', 'ESO-Nr.', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
      body: tableData,
      theme: 'striped',
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [194, 180, 252], // #C2B4FC
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 15 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 5
  }

  // === GESAMT-SUMME ===
  const totalUVP = bom.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  
  if (yPosition > 260) {
    doc.addPage()
    yPosition = 20
  }

  doc.setFillColor(0, 61, 92) // #003D5C
  doc.rect(15, yPosition, 180, 10, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Gesamt-UVP (netto):', 17, yPosition + 7)
  doc.text(`${totalUVP.toFixed(2)} €`, 180, yPosition + 7, { align: 'right' })

  // === IP-DOKUMENTATION (falls vorhanden) ===
  if (ipDocumentation && ipDocumentation.length > 0) {
    doc.addPage() // Neue Seite für IP-Doku
    yPosition = 20

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('IP-Dokumentation', 15, yPosition)
    
    yPosition += 10

    // Für jeden Standort
    ipDocumentation.forEach((siteDoc, index) => {
      if (index > 0) {
        yPosition += 10
      }

      // Standort-Info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(141, 95, 255) // Primary
      doc.rect(15, yPosition, 180, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(`Standort: ${siteDoc.siteName}`, 17, yPosition + 5)
      
      yPosition += 10

      // Gateway & Subnetz Info
      if (siteDoc.gateway || siteDoc.cidr) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        let infoText = ''
        if (siteDoc.gateway) infoText += `Gateway: ${siteDoc.gateway}`
        if (siteDoc.cidr) infoText += ` | Subnetz: ${siteDoc.cidr}`
        doc.text(infoText, 15, yPosition)
        yPosition += 7
      }

      // Geräte-Tabelle
      const ipTableData = siteDoc.devices.map(device => [
        device.type,
        device.label,
        device.manufacturer || '-',
        device.esoNumber || '-',
        device.ip || '-(keine IP)-',
        device.note || '-'
      ])

      // Prüfe ob neue Seite nötig
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      autoTable(doc, {
        startY: yPosition,
        head: [['Typ', 'Bezeichnung', 'Hersteller', 'ESO-Nr.', 'IP-Adresse', 'Notiz']],
        body: ipTableData,
        theme: 'striped',
        styles: { 
          fontSize: 7, 
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [141, 95, 255], // Primary
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 35 }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 5
    })
  }

  // === FOOTER auf allen Seiten ===
  const pageCount = doc.getNumberOfPages()
  const currentDate = new Date().toLocaleDateString('de-DE')
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Erstellt: ${currentDate} | Seite ${i} von ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // === PDF SPEICHERN ===
  const fileName = `Angebot_${project.name?.replace(/[^a-z0-9]/gi, '_') || 'Video-System'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

