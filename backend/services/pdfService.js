import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { capitalize } from '../utils/emailHelpers.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format currency values
 */
const formatMoney = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Format date values
 */
const formatDate = (dateValue) => {
  if (!dateValue) return '—';

  let date;

  // Handle different date formats
  if (typeof dateValue === 'string') {
    // String date (YYYY-MM-DD, ISO string, etc.)
    date = new Date(dateValue);
  } else if (typeof dateValue === 'number') {
    // Unix timestamp
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    // Already a Date object
    date = dateValue;
  } else {
    // Try parsing as integer (timestamp in string form)
    date = new Date(parseInt(dateValue));
  }

  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generate invoice PDF
 * @param {Object} invoice - Invoice data from database
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateInvoicePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Modern soft color palette
      const accent = '#1E40AF'; // Navy blue
      const accentLight = '#DBEAFE'; // Light blue
      const borderColor = '#E5E7EB'; // Soft gray
      const textColor = '#374151'; // Soft dark gray
      const textSecondary = '#6B7280'; // Medium gray
      const headerBg = '#F9FAFB'; // Very light gray

      // Create a document
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      // Buffer to store PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const invoiceNumber = invoice.invoice_number || invoice.id || '—';
      const createdDate = formatDate(invoice.created_at);
      const dueDate = invoice.due_date ? formatDate(invoice.due_date) : '—';
      const status = invoice.status ? invoice.status.toUpperCase() : 'UNPAID';
      const customerName = invoice.customer_name || 'Customer';
      const companyName = invoice.company_name || '';
      const invoiceTitle = invoice.title || 'Invoice';
      const description = invoice.description || '';

      const marginLeft = doc.page.margins.left;
      const contentWidth = doc.page.width - marginLeft - doc.page.margins.right;
      const headerHeight = 90;

      // Modern minimal header with subtle background
      doc
        .save()
        .rect(marginLeft, marginLeft, contentWidth, headerHeight)
        .fill(headerBg);

      // Left side - Invoice text
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('INVOICE', marginLeft + 20, marginLeft + 18);

      // Center - Company logo
      const logoPath = path.join(__dirname, '..', 'images', 'logo-2.png');
      const logoSize = 120;
      const logoX = marginLeft + (contentWidth / 2) - (logoSize / 2);
      const logoY = marginLeft + (headerHeight / 2) - (logoSize / 2);
      doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });

      // Right side header info - cleaner layout with padding
      const rightHeaderX = marginLeft + contentWidth - 200;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(accent)
        .text(`${invoiceNumber}`, rightHeaderX, marginLeft + 18, { width: 180, align: 'right' });

      doc.restore();
      doc.fillColor(textColor);

      let yPosition = marginLeft + headerHeight + 30;

      // Bill To (left column) - modern styling
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(textSecondary)
        .text('BILL TO', marginLeft, yPosition);

      yPosition = doc.y + 8;
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(textColor)
        .text(companyName || customerName, marginLeft, yPosition, { width: 280 });

      doc.font('Helvetica').fontSize(10).fillColor(textSecondary);

      if (invoice.customer_email) {
        yPosition = doc.y + 5;
        doc.text(invoice.customer_email, marginLeft, yPosition, { width: 280 });
      }

      if (invoice.customer_phone) {
        yPosition = doc.y + 4;
        doc.text(invoice.customer_phone, marginLeft, yPosition, { width: 280 });
      }

      if (invoice.customer_address) {
        yPosition = doc.y + 4;
        doc.text(invoice.customer_address, marginLeft, yPosition, { width: 280 });
      }

      const leftBlockEnd = doc.y;

      // Invoice details (right column) - modern styling
      const rightColumnX = marginLeft + contentWidth - 220;
      let rightY = marginLeft + headerHeight + 30;

      const addRightLine = (label, value) => {
        if (label) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(textSecondary)
            .text(label, rightColumnX, rightY, { width: 110 });
        }
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(textColor)
          .text(value, rightColumnX + 112, rightY, { width: 108, align: 'right' });
        rightY += 18;
      };

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(textSecondary)
        .text('INVOICE DETAILS', rightColumnX, rightY);
      rightY = doc.y + 10;
      addRightLine('Date', createdDate);
      addRightLine('Due Date', dueDate);
      addRightLine('Status', status);

      // Payment Stage in top section
      if (invoice.payment_stage) {
        addRightLine('Payment Stage', `${capitalize(invoice.payment_stage)}${invoice.percentage ? ` (${invoice.percentage}%)` : ''}`);
      }

      yPosition = Math.max(leftBlockEnd, rightY) + 24;

      // Divider line
      doc
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(marginLeft, yPosition)
        .lineTo(marginLeft + contentWidth, yPosition)
        .stroke();

      yPosition += 24;

      // Title / description - modern styling
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(textColor)
        .text(invoiceTitle, marginLeft, yPosition, { width: contentWidth });

      yPosition = doc.y + 10;

      if (description) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(textSecondary)
          .text(description, marginLeft, yPosition, { width: contentWidth });
        yPosition = doc.y + 20;
      } else {
        yPosition += 10;
      }

      // Line items header - modern clean design with light blue background
      const tableTop = yPosition + 6;
      const descWidth = 260;
      const qtyWidth = 60;
      const rateWidth = 75;
      const amountWidth = 85;
      const tableHeight = 28;

      doc
        .fillColor(accentLight)
        .rect(marginLeft, tableTop, contentWidth, tableHeight)
        .fill();

      doc
        .fillColor(accent)
        .font('Helvetica')
        .fontSize(9)
        .text('DESCRIPTION', marginLeft + 12, tableTop + 10, { width: descWidth - 10 })
        .text('QTY', marginLeft + descWidth, tableTop + 10, { width: qtyWidth, align: 'right' })
        .text('RATE', marginLeft + descWidth + qtyWidth + 8, tableTop + 10, { width: rateWidth, align: 'right' })
        .text('AMOUNT', marginLeft + descWidth + qtyWidth + rateWidth + 16, tableTop + 10, {
          width: amountWidth,
          align: 'right',
        });

      // Parse line items
      let lineItems = [];
      if (typeof invoice.line_items === 'string') {
        try {
          lineItems = JSON.parse(invoice.line_items);
        } catch (e) {
          lineItems = [];
        }
      } else if (Array.isArray(invoice.line_items)) {
        lineItems = invoice.line_items;
      }

      yPosition = tableTop + tableHeight;

      doc.font('Helvetica').fontSize(10).fillColor(textColor);
      lineItems.forEach((item, index) => {
        const rowHeight = 32;
        const rowY = yPosition + index * rowHeight;

        // Subtle row separator
        if (index > 0) {
          doc
            .strokeColor(borderColor)
            .lineWidth(0.5)
            .moveTo(marginLeft, rowY)
            .lineTo(marginLeft + contentWidth, rowY)
            .stroke();
        }

        const amount = item.amount !== undefined ? item.amount : (item.quantity || 0) * (item.rate || 0);

        doc
          .fillColor(textColor)
          .font('Helvetica')
          .text(item.description || 'N/A', marginLeft + 12, rowY + 10, { width: descWidth - 10 })
          .fillColor(textSecondary)
          .text(item.quantity !== undefined ? item.quantity : 0, marginLeft + descWidth, rowY + 10, {
            width: qtyWidth,
            align: 'right',
          })
          .text(formatMoney(item.rate || 0), marginLeft + descWidth + qtyWidth + 8, rowY + 10, {
            width: rateWidth,
            align: 'right',
          })
          .fillColor(textColor)
          .font('Helvetica')
          .text(formatMoney(amount || 0), marginLeft + descWidth + qtyWidth + rateWidth + 16, rowY + 10, {
            width: amountWidth,
            align: 'right',
          });
      });

      yPosition += lineItems.length * 32;

      // Bottom border of table
      doc
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(marginLeft, yPosition)
        .lineTo(marginLeft + contentWidth, yPosition)
        .stroke();

      // Totals Section - modern styling
      yPosition += 20;
      const totalsX = marginLeft + contentWidth - 240;

      const addTotalLine = (label, value, bold = false, color = textColor, bgColor = null) => {
        if (bgColor) {
          doc
            .fillColor(bgColor)
            .rect(totalsX - 10, yPosition - 4, 250, 28)
            .fill();
        }
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 13 : 10)
          .fillColor(color)
          .text(label, totalsX, yPosition, { width: 120, align: 'left' })
          .text(value, totalsX + 120, yPosition, { width: 120, align: 'right' });
        yPosition += bold ? 32 : 18;
      };

      addTotalLine('Subtotal', formatMoney(invoice.subtotal || 0), false, textSecondary);
      addTotalLine('Tax', formatMoney(invoice.tax || 0), false, textSecondary);
      addTotalLine('Total', formatMoney(invoice.total || 0), true, accent);

      // Notes Section - modern styling
      if (invoice.notes) {
        yPosition += 16;
        const noteText = invoice.notes;
        doc.font('Helvetica').fontSize(9);
        const notesHeight = doc.heightOfString(noteText, { width: contentWidth - 32 });
        const noteBoxHeight = notesHeight + 36;

        doc
          .fillColor(headerBg)
          .rect(marginLeft, yPosition, contentWidth, noteBoxHeight)
          .fill();

        doc
          .fillColor(textSecondary)
          .font('Helvetica')
          .fontSize(9)
          .text('NOTES', marginLeft + 16, yPosition + 12);

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(textColor)
          .text(noteText, marginLeft + 16, yPosition + 26, { width: contentWidth - 32 });

        yPosition += noteBoxHeight + 10;
      }

     
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
