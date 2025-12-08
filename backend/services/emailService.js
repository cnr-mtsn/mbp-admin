import nodemailer from 'nodemailer';
import { generateInvoicePDF } from './pdfService.js';

// Create reusable transporter (single config shared by all environments)
const createTransporter = () => {
  const secureFromEnv = process.env.SMTP_SECURE === 'true';
  const port = Number(process.env.SMTP_PORT) || (secureFromEnv ? 465 : 587);
  // Gmail: secure=true for 465, secure=false/starttls for 587
  const useTlsImmediately = port === 465 || secureFromEnv;

  const secure = useTlsImmediately && port === 465 ? true : false;

  if (useTlsImmediately && port !== 465) {
    console.warn('[email] SMTP_SECURE=true but port is not 465; falling back to STARTTLS on port', port);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    requireTLS: !secure, // force STARTTLS when using 587
  });
};

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
 * Send invoice email with PDF attachment
 * @param {Object} invoice - Invoice data from database
 */
export const sendInvoiceEmail = async (invoice) => {
  try {
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Create transporter
    const transporter = createTransporter();

    // For development, override recipient email
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const recipientEmail = 'cnr.mtsn@gmail.com'
    
    // const recipientEmail = isDevelopment ? 'c.matson11@gmail.com' : invoice.customer_email;

    // Email options
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: `Invoice: ${invoice.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice from Matson Bros</h2>
          <p>Dear ${invoice.customer_name},</p>
          <p>Please find attached your invoice for <strong>${invoice.title}</strong>.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${invoice.invoice_number || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${formatMoney(invoice.total)}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(invoice.due_date)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-transform: uppercase;">${invoice.status}</td>
            </tr>
          </table>

          ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes.replace(/\n/g, '<br>')}</p>` : ''}

          <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Matson Bros</strong>
          </p>

          ${isDevelopment ? '<p style="color: #999; font-size: 12px; margin-top: 20px;"><em>This is a development email. In production, this would be sent to: ' + invoice.customer_email + '</em></p>' : ''}
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number || invoice.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
