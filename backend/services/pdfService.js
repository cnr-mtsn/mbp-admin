import PDFDocument from 'pdfkit';

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
  const date = new Date(parseInt(dateValue));
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

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 50);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Matson Bros', 50, 80)
        .font('Helvetica')
        .fontSize(10)
        .text('Painting & Contracting Services', 50, 95);

      // Invoice Number and Date (right aligned)
      if (invoice.invoice_number) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`Invoice #: `, 400, 50, { width: 50, align: 'left', continued: true })
          .font('Helvetica')
          .text(invoice.invoice_number, { width: 100, align: 'left' });
      }

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Date: ', 400, 65, { width: 50, align: 'left', continued: true })
        .font('Helvetica')
        .text(formatDate(invoice.created_at), { width: 100, align: 'left' });

      if (invoice.due_date) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Due Date: ', 400, 80, { width: 50, align: 'left', continued: true })
          .font('Helvetica')
          .text(formatDate(invoice.due_date), { width: 100, align: 'left' });
      }

      // Customer Information
      let yPosition = 130;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPosition);

      yPosition += 20;
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.customer_name || 'N/A', 50, yPosition);

      if (invoice.customer_email) {
        yPosition += 15;
        doc.text(invoice.customer_email, 50, yPosition);
      }

      if (invoice.customer_phone) {
        yPosition += 15;
        doc.text(invoice.customer_phone, 50, yPosition);
      }

      if (invoice.customer_address) {
        yPosition += 15;
        doc.text(invoice.customer_address, 50, yPosition, { width: 250 });
      }

      // Invoice Title and Description
      yPosition += 40;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(invoice.title, 50, yPosition, { width: 500 });

      if (invoice.description) {
        yPosition += 25;
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(invoice.description, 50, yPosition, { width: 500 });
      }

      // Line Items Table
      yPosition += 40;
      const tableTop = yPosition;

      // Table Header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .rect(50, tableTop, 512, 20)
        .fillAndStroke('#f0f0f0', '#cccccc')
        .fillColor('#000000')
        .text('Description', 55, tableTop + 5, { width: 260 })
        .text('Qty', 320, tableTop + 5, { width: 50, align: 'right' })
        .text('Rate', 380, tableTop + 5, { width: 80, align: 'right' })
        .text('Amount', 470, tableTop + 5, { width: 87, align: 'right' });

      yPosition = tableTop + 25;

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

      // Table Rows
      doc.font('Helvetica');
      lineItems.forEach((item, index) => {
        const rowHeight = 20;

        // Alternate row colors
        if (index % 2 === 0) {
          doc
            .fillColor('#ffffff')
            .rect(50, yPosition - 3, 512, rowHeight)
            .fill();
        }

        doc
          .fillColor('#000000')
          .fontSize(9)
          .text(item.description || 'N/A', 55, yPosition, { width: 260 })
          .text((item.quantity || 0).toString(), 320, yPosition, { width: 50, align: 'right' })
          .text(formatMoney(item.rate || 0), 380, yPosition, { width: 80, align: 'right' })
          .text(formatMoney(item.amount || 0), 470, yPosition, { width: 87, align: 'right' });

        yPosition += rowHeight;
      });

      // Bottom border of table
      doc
        .strokeColor('#cccccc')
        .moveTo(50, yPosition)
        .lineTo(562, yPosition)
        .stroke();

      // Totals Section
      yPosition += 20;
      const totalsX = 400;

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', totalsX, yPosition, { width: 70, align: 'right' })
        .text(formatMoney(invoice.subtotal || 0), totalsX + 75, yPosition, { width: 87, align: 'right' });

      yPosition += 20;
      doc
        .text('Tax:', totalsX, yPosition, { width: 70, align: 'right' })
        .text(formatMoney(invoice.tax || 0), totalsX + 75, yPosition, { width: 87, align: 'right' });

      yPosition += 20;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', totalsX, yPosition, { width: 70, align: 'right' })
        .text(formatMoney(invoice.total || 0), totalsX + 75, yPosition, { width: 87, align: 'right' });

      // Status
      yPosition += 30;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Status: ', totalsX, yPosition, { width: 70, align: 'right', continued: true })
        .font('Helvetica')
        .text((invoice.status || 'unpaid').toUpperCase());

      // Payment Information
      if (invoice.payment_stage) {
        yPosition += 20;
        doc
          .font('Helvetica-Bold')
          .text('Payment Stage: ', totalsX, yPosition, { width: 70, align: 'right', continued: true })
          .font('Helvetica')
          .text(`${invoice.payment_stage}${invoice.percentage ? ` (${invoice.percentage}%)` : ''}`);
      }

      // Notes Section
      if (invoice.notes) {
        yPosition += 40;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Notes:', 50, yPosition);

        yPosition += 15;
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(invoice.notes, 50, yPosition, { width: 500 });
      }

      // Footer
      const pageHeight = doc.page.height;
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          'Thank you for your business!',
          50,
          pageHeight - 50,
          { align: 'center', width: 512 }
        );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
