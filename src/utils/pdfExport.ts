import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AsinItem } from '../types';

// Convert an image URL to a base64 data URL via the image proxy
async function getBase64Image(imageUrl: string): Promise<string | null> {
  try {
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxiedUrl, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface ExportPdfOptions {
  exportType: 'all' | 'valid' | 'no';
  titleSuffix?: string;
  onProgress?: (current: number, total: number) => void;
}

export async function generateAsinReportPdf(
  items: AsinItem[],
  options: ExportPdfOptions = { exportType: 'all' }
): Promise<void> {
  let filteredItems = items;
  if (options.exportType === 'valid') {
    filteredItems = items.filter((i) => i.status === 'valid');
  } else if (options.exportType === 'no') {
    filteredItems = items.filter((i) => i.status === 'no');
  }

  if (filteredItems.length === 0) {
    alert('No items to export for the selected filter.');
    return;
  }

  // Pre-load images for valid items (max 20 to keep PDF fast & lightweight)
  const imageMap = new Map<string, string>();
  const itemsWithImages = filteredItems.filter((i) => i.status === 'valid' && i.imageUrl);

  for (let idx = 0; idx < itemsWithImages.length; idx++) {
    const it = itemsWithImages[idx];
    if (options.onProgress) {
      options.onProgress(idx + 1, itemsWithImages.length);
    }
    if (it.imageUrl) {
      const b64 = await getBase64Image(it.imageUrl);
      if (b64) {
        imageMap.set(it.id, b64);
      }
    }
  }

  // Initialize jsPDF in landscape for a comfortable multi-column table layout
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 54, 'F');

  // Amazon Orange Accent stripe
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 50, pageWidth, 4, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Amazon ASIN Bulk Checker Report', margin, 32);

  // Subtitle / Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Generated: ${dateStr} | Scope: ${options.exportType.toUpperCase()}`, pageWidth - margin, 32, {
    align: 'right',
  });

  // Summary Metrics Bar
  const totalCount = filteredItems.length;
  const validCount = filteredItems.filter((i) => i.status === 'valid').length;
  const noCount = filteredItems.filter((i) => i.status === 'no').length;

  const summaryY = 70;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, summaryY, pageWidth - margin * 2, 40, 6, 6, 'FD');

  // Metric: Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Checked: ${totalCount}`, margin + 16, summaryY + 24);

  // Metric: Valid
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`Valid Products: ${validCount}`, margin + 160, summaryY + 24);

  // Metric: NO / Invalid
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`Invalid / NO: ${noCount}`, margin + 310, summaryY + 24);

  // Prepare table data
  const tableData = filteredItems.map((item, index) => {
    const statusText = item.status === 'valid' ? 'VALID' : item.status === 'no' ? 'NO' : item.status.toUpperCase();
    const details = [
      item.title || (item.status === 'no' ? 'No product listing found' : 'Pending check'),
      item.price ? `Price: ${item.price}` : '',
      item.reason ? `Info: ${item.reason}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return [
      (index + 1).toString(),
      item.asin,
      statusText,
      item.imageUrl ? 'Product Image' : '—',
      details,
      item.url,
    ];
  });

  // AutoTable configuration
  autoTable(doc, {
    startY: summaryY + 52,
    head: [['#', 'ASIN', 'Status', 'Image Preview', 'Product Title & Details', 'Amazon URL']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 64, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 70, halign: 'center' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 160, textColor: [37, 99, 235] },
    },
    didParseCell: (data) => {
      // Style Status cell
      if (data.section === 'body' && data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val === 'VALID') {
          data.cell.styles.textColor = [16, 185, 129]; // emerald
          data.cell.styles.fillColor = [236, 253, 245]; // emerald-50
        } else if (val === 'NO') {
          data.cell.styles.textColor = [225, 29, 72]; // rose
          data.cell.styles.fillColor = [255, 241, 242]; // rose-50
        }
      }

      // Clear text in Image cell if we have a base64 thumbnail to render
      if (data.section === 'body' && data.column.index === 3) {
        const item = filteredItems[data.row.index];
        if (item && imageMap.has(item.id)) {
          data.cell.text = [];
        }
      }
    },
    didDrawCell: (data) => {
      // Embed product image thumbnail directly inside cell
      if (data.section === 'body' && data.column.index === 3) {
        const item = filteredItems[data.row.index];
        if (item && imageMap.has(item.id)) {
          const b64 = imageMap.get(item.id);
          if (b64) {
            try {
              const imgSize = 32;
              const xPos = data.cell.x + (data.cell.width - imgSize) / 2;
              const yPos = data.cell.y + (data.cell.height - imgSize) / 2;
              doc.addImage(b64, 'JPEG', xPos, yPos, imgSize, imgSize);
            } catch {
              // ignore image draw errors
            }
          }
        }
      }

      // Add clickable hyperlink to Amazon URL column
      if (data.section === 'body' && data.column.index === 5) {
        const item = filteredItems[data.row.index];
        if (item && item.url) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: item.url,
          });
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.getNumberOfPages()} | Amazon ASIN Bulk Checker Report`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(str, pageWidth - margin, pageHeight - 16, { align: 'right' });
    },
    margin: { left: margin, right: margin, bottom: 30, top: 20 },
  });

  // Save the PDF
  const filename = `amazon-asin-report-${options.exportType}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
