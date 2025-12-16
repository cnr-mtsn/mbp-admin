import nodemailer from 'nodemailer';
import { generateInvoicePDF } from './pdfService.js';

// Create reusable transporter (single config shared by all environments)
const createTransporter = () => {
  const secureFromEnv = process.env.EMAIL_SECURE === 'true';
  const port = Number(process.env.EMAIL_PORT) || (secureFromEnv ? 465 : 587);
  // Gmail: secure=true for 465, secure=false/starttls for 587
  const useTlsImmediately = port === 465 || secureFromEnv;

  const secure = useTlsImmediately && port === 465 ? true : false;

  if (useTlsImmediately && port !== 465) {
    console.warn('[email] EMAIL_SECURE=true but port is not 465; falling back to STARTTLS on port', port);
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
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
 * Generate email HTML content for invoice
 * @param {Object} invoice - Invoice data from database
 * @param {Object} options - Optional parameters
 * @returns {string} HTML content for email
 */
const generateInvoiceEmailHTML = (invoice, options = {}) => {
  console.log("generate email for invoice: ", invoice)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const invoiceNumber = invoice.invoice_number || invoice.id || '—';
  const dueDate = formatDate(invoice.due_date);
  const totalAmount = formatMoney(invoice.total);
  const status = invoice.status ? invoice.status.toUpperCase() : '—';
  const customerName = invoice.customer_name || 'Customer';
  const companyName = invoice.company_name || ''
  const invoiceTitle = invoice.title || 'Your invoice';

  // Use custom body if provided, otherwise use default template
  if (options.body) {
    return options.body;
  }

  return `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #e6e9ed;
        border-radius: 10px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
      "
    >
      <div style="background: #1f365c; color: #ffffff; padding: 18px 22px">
        <h2 style="margin: 0 0 4px; font-size: 20px">Invoice from Matson Bros</h2>
        <p style="margin: 0; font-size: 14px">
          Invoice ${invoiceNumber} &bull; Due ${dueDate}
        </p>
      </div>

      <div style="padding: 22px">
        <p style="margin: 0 0 12px; color: #1f365c">Hello ${companyName || customerName},</p>
        <p style="margin: 0 0 16px; color: #1f365c">
          Job: <strong>${invoiceTitle}</strong>
        </p>
        <p style="margin: 0 0 12px; color: #334357">
          Full invoice details are in the attached PDF.
        </p>

        <table
          style="
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin: 0 0 16px;
          "
        >
          <tr>
            <td
              style="
                width: 50%;
                background: #f7f9fc;
                padding: 12px;
                border: 1px solid #e6e9ed;
                color: #1f365c;
              "
            >
              <strong>Total Amount</strong>
            </td>
            <td
              style="
                padding: 12px;
                border: 1px solid #e6e9ed;
                text-align: right;
                color: #1f365c;
              "
            >
              ${totalAmount}
            </td>
          </tr>
          <tr>
            <td
              style="
                width: 50%;
                background: #f7f9fc;
                padding: 12px;
                border: 1px solid #e6e9ed;
                color: #1f365c;
              "
            >
              <strong>Payment Due</strong>
            </td>
            <td
              style="
                padding: 12px;
                border: 1px solid #e6e9ed;
                text-align: right;
                color: #1f365c;
              "
            >
              ${dueDate}
            </td>
          </tr>
          <tr>
            <td
              style="
                width: 50%;
                background: #f7f9fc;
                padding: 12px;
                border: 1px solid #e6e9ed;
                color: #1f365c;
              "
            >
              <strong>Status</strong>
            </td>
            <td
              style="
                padding: 12px;
                border: 1px solid #e6e9ed;
                text-align: right;
                color: #1f365c;
              "
            >
              ${status}
            </td>
          </tr>
        </table>

        ${
          invoice.notes
            ? `<div
                style="
                  background: #f7f9fc;
                  border: 1px solid #e6e9ed;
                  border-radius: 8px;
                  padding: 12px 14px;
                  margin: 0 0 16px;
                  color: #334357;
                  font-size: 14px;
                "
              >
                <strong style="display: block; margin-bottom: 6px">Notes</strong>
                ${invoice.notes.replace(/\n/g, '<br>')}
              </div>`
            : ''
        }

        <div
          style="
            background: #f7f9fc;
            border: 1px solid #e6e9ed;
            border-radius: 8px;
            padding: 14px;
            margin: 0 0 16px;
            color: #1f365c;
            font-size: 14px;
          "
        >
          <strong style="display: block; margin-bottom: 6px">How to pay:</strong>
          <ul style="padding-left: 18px; margin: 0; color: #334357">
            <li style="margin-bottom: 6px">Cash</li>
            <li style="margin-bottom: 6px">
              Online at
              <a
                href="https://matsonbrotherspainting.com/pay"
                style="color: #1f365c; font-weight: bold"
              >matsonbrotherspainting.com/pay</a>
            </li>
            <li style="margin-bottom: 6px">Check (details below)</li>
          </ul>
        </div>

        <p style="margin: 0 0 18px; color: #334357">
          Please include the invoice number with your payment. If you have any questions,
          reply to this email and we will help right away.
        </p>

        <div
          style="
            border: 1px solid #e6e9ed;
            border-radius: 8px;
            padding: 12px 14px;
            margin: 0 0 14px;
            color: #334357;
            font-size: 14px;
            background: #ffffff;
          "
        >
          <strong style="display: block; margin-bottom: 6px">Paying by check?</strong>
          <div style="margin-bottom: 4px">
            Make payable to <strong>Matson Brothers Painting</strong>
          </div>
          <div style="margin-bottom: 4px">
            Mail to 38104 E Hudson Rd, Oak Grove, MO, 64075
          </div>
          <div>Include invoice number: ${invoiceNumber}</div>
        </div>

        <a
          href="https://matsonbrotherspainting.com/pay"
          style="
            display: inline-block;
            background: #1f365c;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
          "
        >Pay Online</a>

        <p style="margin: 20px 0 0; color: #334357">
          Thank you,<br />
          <strong>Matson Brothers Painting</strong>
        </p>

        ${
          isDevelopment
            ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">
                <em>This is a development email. In production, this would be sent to: ${invoice.customer_email}</em>
              </p>`
            : ''
        }
      </div>
    </div>
  `;
};

/**
 * Get default CC emails from environment variable
 * @returns {Array<string>} Array of CC email addresses
 */
const getDefaultCcEmails = () => {
  const ccEmailsFromEnv = process.env.CC_EMAILS;
  if (ccEmailsFromEnv) {
    if (ccEmailsFromEnv.includes(',')) {
      return ccEmailsFromEnv.split(',').map(email => email.trim());
    }
    return [ccEmailsFromEnv.trim()];
  }
  return [];
};

/**
 * Get email preview data without sending
 * @param {Object} invoice - Invoice data from database
 * @returns {Object} Email preview data
 */
export const getInvoiceEmailPreview = (invoice) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const invoiceTitle = invoice.title || 'Your invoice';
  const recipientEmail = isDevelopment ? process.env.DEV_EMAIL_TO : invoice.customer_email;
  const customerName = invoice?.customer_name || ""
  const companyName = invoice?.company_name || ""
  const recipient = companyName !== "" ? `"${companyName}" <${recipientEmail}>` : (customerName !== "" ? `"${customerName}" <${recipientEmail}>` : recipientEmail);

  return {
    from: `Matson Brothers Painting - Billing <${process.env.EMAIL_FROM}>`,
    to: recipient,
    cc: getDefaultCcEmails(),
    subject: `Invoice: ${invoiceTitle}`,
    body: generateInvoiceEmailHTML(invoice),
    attachmentName: `invoice-${invoice.invoice_number || invoice.id}.pdf`,
  };
};

/**
 * Send invoice email with PDF attachment
 * @param {Object} invoice - Invoice data from database
 * @param {Object} options - Optional custom email parameters
 * @param {string} options.recipientEmail - Override recipient email
 * @param {Array<string>} options.ccEmails - CC email addresses
 * @param {string} options.subject - Override subject line
 * @param {string} options.body - Override email body HTML
 */
export const sendInvoiceEmail = async (invoice, options = {}) => {
  try {
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Create transporter
    const transporter = createTransporter();

    // For development, override recipient email
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const invoiceTitle = invoice.title || 'Your invoice';

    // Use custom recipient email if provided, otherwise fall back to default behavior
    const recipientEmail = options.recipientEmail ||
      (isDevelopment ? process.env.DEV_EMAIL_TO : invoice.customer_email);

    const customerName = invoice?.customer_name || ""
    const companyName = invoice?.company_name || ""
    const recipient = companyName !== "" ? `"${companyName}" <${recipientEmail}>` : (customerName !== "" ? `"${customerName}" <${recipientEmail}>` : recipientEmail);

    // Use custom subject if provided, otherwise use default
    const subject = options.subject || `Invoice: ${invoiceTitle}`;

    // Generate HTML body (uses custom body if provided in options)
    const htmlBody = generateInvoiceEmailHTML(invoice, options);

    // Email options
    const mailOptions = {
      from: `Matson Brothers Painting - Billing <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number || invoice.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Add CC emails - merge default CC emails with any provided in options
    const defaultCcEmails = getDefaultCcEmails();
    const allCcEmails = options.ccEmails && options.ccEmails.length > 0
      ? [...new Set([...defaultCcEmails, ...options.ccEmails])] // Merge and remove duplicates
      : defaultCcEmails;

    if (allCcEmails.length > 0) {
      mailOptions.cc = allCcEmails.join(', ');
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
