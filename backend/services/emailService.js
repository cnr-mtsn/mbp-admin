import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { generateInvoicePDF, generateEstimatePDF } from './pdfService.js';
import { logActivity } from './activityLogService.js';

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

  // Generate tracking token for email open tracking
  const trackingToken = generateInvoiceEmailToken(invoice.id);

  // Determine the base URL based on environment
  const baseUrl = isDevelopment
    ? 'http://localhost:4000'
    : process.env.API_BASE_URL || 'https://api.matsonbrotherspainting.com';

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
        <h2 style="margin: 0 0 4px; font-size: 20px">Invoice from Matson Brothers Painting</h2>
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
          View full invoice details in the attached PDF.
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
            Mail to <strong>38104 E Hudson Rd, Oak Grove, MO, 64075</strong>
          </div>
          <div>Memo: <strong>${invoice.invoice_number}</strong></div>
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
      <!-- Email tracking pixel -->
      <img src="${baseUrl}/api/invoices/${invoice.id}/track-open?token=${trackingToken}" width="1" height="1" style="display:block" alt="" />
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
  const invoiceTitle = invoice.title || 'Your invoice';
  // For preview, always show the customer's actual email (not dev override)
  // The dev override only applies when actually sending
  const recipientEmail = invoice.customer_email;
  const customerName = invoice?.customer_name || ""
  const companyName = invoice?.company_name || ""
  const recipient = companyName !== "" ? `"${companyName}" <${recipientEmail}>` : (customerName !== "" ? `"${customerName}" <${recipientEmail}>` : recipientEmail);
  const subject = `MBP Invoice #${invoice.invoice_number}: ${invoiceTitle}`;

  return {
    from: `Matson Brothers Painting - Billing <${process.env.EMAIL_FROM}>`,
    to: recipient,
    cc: getDefaultCcEmails(),
    subject: subject,
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
    const subject = options.subject || `MBP Invoice #${invoice.invoice_number}: ${invoiceTitle}`;

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

    // Log activity
    await logActivity({
      entityType: 'invoice',
      entityId: invoice.id,
      activityType: 'sent',
      userId: options.userId || null,
      userName: options.userName || 'System',
      metadata: {
        recipientEmail,
        ccEmails: allCcEmails,
        subject,
        messageId: info.messageId
      }
    });

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Generate a secure token for estimate approval/decline
 * @param {string} estimateId - Estimate ID
 * @param {string} action - 'approve' or 'decline'
 * @returns {string} JWT token
 */
const generateEstimateActionToken = (estimateId, action) => {
  return jwt.sign(
    {
      estimateId,
      action,
      type: 'estimate_action'
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // Token valid for 30 days
  );
};

/**
 * Generate a tracking token for invoice emails
 * @param {string} invoiceId - Invoice UUID
 * @returns {string} JWT token
 */
const generateInvoiceEmailToken = (invoiceId) => {
  return jwt.sign(
    {
      invoiceId,
      type: 'invoice_email'
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // Token valid for 30 days
  );
};

/**
 * Generate email HTML content for estimate
 * @param {Object} estimate - Estimate data from database
 * @param {Object} options - Optional parameters
 * @returns {string} HTML content for email
 */
const generateEstimateEmailHTML = (estimate, options = {}) => {
  console.log("generate email for estimate: ", estimate)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const estimateNumber = estimate.id ? `EST-${estimate.id.slice(0, 8).toUpperCase()}` : 'EST-DRAFT';
  const totalAmount = formatMoney(estimate.total);
  const status = estimate.status ? estimate.status.toUpperCase() : '—';
  const customerName = estimate.customer_name || 'Customer';
  const companyName = estimate.company_name || ''
  const estimateTitle = estimate.title || 'Your estimate';

  // Use custom body if provided, otherwise use default template
  if (options.body) {
    return options.body;
  }

  // Generate secure tokens for approve/decline actions
  const approveToken = generateEstimateActionToken(estimate.id, 'approve');
  const declineToken = generateEstimateActionToken(estimate.id, 'decline');

  // Determine the base URL based on environment
  const baseUrl = isDevelopment
    ? 'http://localhost:4000'
    : process.env.API_BASE_URL || 'https://api.matsonbrotherspainting.com';

  const approveUrl = `${baseUrl}/api/estimates/${estimate.id}/approve?token=${approveToken}`;
  const declineUrl = `${baseUrl}/api/estimates/${estimate.id}/decline?token=${declineToken}`;

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
        <h2 style="margin: 0 0 4px; font-size: 20px">Estimate from Matson Brothers Painting</h2>
        <p style="margin: 0; font-size: 14px">
          Estimate ${estimateNumber}
        </p>
      </div>

      <div style="padding: 22px">
        <p style="margin: 0 0 12px; color: #1f365c">Hello ${companyName || customerName},</p>
        <p style="margin: 0 0 16px; color: #1f365c">
          Project: <strong>${estimateTitle}</strong>
        </p>
        <p style="margin: 0 0 12px; color: #334357">
          View full estimate details in the attached PDF.
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
          estimate.notes
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
                ${estimate.notes.replace(/\n/g, '<br>')}
              </div>`
            : ''
        }

        <div
          style="
            background: #fff9e6;
            border: 1px solid #ffe066;
            border-radius: 8px;
            padding: 14px;
            margin: 0 0 16px;
            color: #8b6914;
            font-size: 14px;
          "
        >
          <strong style="display: block; margin-bottom: 6px">📅 Validity</strong>
          This estimate is valid for 30 days from the date of issue.
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 12px; color: #334357; font-size: 14px">
            <strong>Ready to get started?</strong>
          </p>
          <a
            href="${approveUrl}"
            style="
              display: inline-block;
              background: #16a34a;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: bold;
              font-size: 14px;
              margin: 0 8px;
            "
          >✓ Approve Estimate</a>
          <a
            href="${declineUrl}"
            style="
              display: inline-block;
              background: #dc2626;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: bold;
              font-size: 14px;
              margin: 0 8px;
            "
          >✗ Decline Estimate</a>
        </div>

        <p style="margin: 0 0 18px; color: #334357">
          If you have any questions about this estimate,
          please reply to this email and we will be happy to help.
        </p>

        <p style="margin: 20px 0 0; color: #334357">
          Thank you,<br />
          <strong>Matson Brothers Painting</strong>
        </p>

        ${
          isDevelopment
            ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">
                <em>This is a development email. In production, this would be sent to: ${estimate.customer_email}</em>
              </p>`
            : ''
        }
      </div>
      <!-- Email tracking pixel -->
      <img src="${baseUrl}/api/estimates/${estimate.id}/track-open?token=${approveToken}" width="1" height="1" style="display:block" alt="" />
    </div>
  `;
};

/**
 * Get email preview data without sending
 * @param {Object} estimate - Estimate data from database
 * @returns {Object} Email preview data
 */
export const getEstimateEmailPreview = (estimate) => {
  const estimateTitle = estimate.title || 'Your estimate';
  // For preview, always show the customer's actual email (not dev override)
  // The dev override only applies when actually sending
  const recipientEmail = estimate.customer_email;
  const customerName = estimate?.customer_name || ""
  const companyName = estimate?.company_name || ""
  const recipient = companyName !== "" ? `"${companyName}" <${recipientEmail}>` : (customerName !== "" ? `"${customerName}" <${recipientEmail}>` : recipientEmail);
  const estimateNumber = estimate.id ? `EST-${estimate.id.slice(0, 8).toUpperCase()}` : 'EST-DRAFT';
  const subject = `MBP Estimate ${estimateNumber}: ${estimateTitle}`;

  return {
    from: `Matson Brothers Painting - Billing <${process.env.EMAIL_FROM}>`,
    to: recipient,
    cc: getDefaultCcEmails(),
    subject: subject,
    body: generateEstimateEmailHTML(estimate),
    attachmentName: `estimate-${estimateNumber}.pdf`,
  };
};

/**
 * Send estimate email with PDF attachment
 * @param {Object} estimate - Estimate data from database
 * @param {Object} options - Optional custom email parameters
 * @param {string} options.recipientEmail - Override recipient email
 * @param {Array<string>} options.ccEmails - CC email addresses
 * @param {string} options.subject - Override subject line
 * @param {string} options.body - Override email body HTML
 */
export const sendEstimateEmail = async (estimate, options = {}) => {
  try {
    // Generate PDF
    const pdfBuffer = await generateEstimatePDF(estimate);

    // Create transporter
    const transporter = createTransporter();

    // For development, override recipient email
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const estimateTitle = estimate.title || 'Your estimate';

    // Use custom recipient email if provided, otherwise fall back to default behavior
    const recipientEmail = options.recipientEmail ||
      (isDevelopment ? process.env.DEV_EMAIL_TO : estimate.customer_email);

    const customerName = estimate?.customer_name || ""
    const companyName = estimate?.company_name || ""
    const recipient = companyName !== "" ? `"${companyName}" <${recipientEmail}>` : (customerName !== "" ? `"${customerName}" <${recipientEmail}>` : recipientEmail);

    const estimateNumber = estimate.id ? `EST-${estimate.id.slice(0, 8).toUpperCase()}` : 'EST-DRAFT';

    // Use custom subject if provided, otherwise use default
    const subject = options.subject || `MBP Estimate ${estimateNumber}: ${estimateTitle}`;

    // Generate HTML body (uses custom body if provided in options)
    const htmlBody = generateEstimateEmailHTML(estimate, options);

    // Email options
    const mailOptions = {
      from: `Matson Brothers Painting - Billing <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: `estimate-${estimateNumber}.pdf`,
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

    console.log('Estimate email sent:', info.messageId);

    // Log activity
    await logActivity({
      entityType: 'estimate',
      entityId: estimate.id,
      activityType: 'sent',
      userId: options.userId || null,
      userName: options.userName || 'System',
      metadata: {
        recipientEmail,
        ccEmails: allCcEmails,
        subject,
        messageId: info.messageId
      }
    });

    return info;
  } catch (error) {
    console.error('Error sending estimate email:', error);
    throw error;
  }
};

/**
 * Send password reset email with secure link
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Raw reset token (not hashed)
 * @param {string} userName - User's first name or username
 */
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Determine the reset URL based on environment
    // In development, default to billing app on localhost:5174
    const resetUrl = isDevelopment
      ? `http://localhost:5174/account/reset-password?token=${resetToken}`
      : `https://billing.matsonbrotherspainting.com/account/reset-password?token=${resetToken}`;

    // Generate HTML email with company branding
    const htmlBody = `
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
          <h2 style="margin: 0 0 4px; font-size: 20px">Password Reset Request</h2>
          <p style="margin: 0; font-size: 14px">
            Matson Brothers Painting - Security
          </p>
        </div>

        <div style="padding: 22px">
          <p style="margin: 0 0 12px; color: #1f365c">Hello ${userName},</p>

          <p style="margin: 0 0 16px; color: #334357">
            We received a request to reset your password for your Matson Brothers Painting account.
            If you made this request, click the button below to reset your password.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                background: #1f365c;
                color: #ffffff;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              "
            >Reset Password</a>
          </div>

          <div
            style="
              background: #fff9e6;
              border: 1px solid #ffe066;
              border-radius: 8px;
              padding: 14px;
              margin: 20px 0;
              color: #8b6914;
              font-size: 14px;
            "
          >
            <strong style="display: block; margin-bottom: 6px">⚠️ Security Notice</strong>
            This link will expire in <strong>1 hour</strong> for your security.
            If you didn't request a password reset, you can safely ignore this email.
            Your password will not be changed unless you click the link above and create a new password.
          </div>

          <p style="margin: 0 0 12px; color: #334357; font-size: 14px">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 0 0 16px; color: #1f365c; font-size: 13px; word-break: break-all">
            ${resetUrl}
          </p>

          <p style="margin: 20px 0 0; color: #334357">
            Thank you,<br />
            <strong>Matson Brothers Painting</strong>
          </p>

          ${
            isDevelopment
              ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">
                  <em>This is a development email. In production, this would be sent to: ${email}</em>
                </p>`
              : ''
          }
        </div>
      </div>
    `;

    // Create transporter
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: `Matson Brothers Painting - Security <${process.env.EMAIL_FROM}>`,
      to: isDevelopment ? process.env.DEV_EMAIL_TO : email,
      subject: 'Password Reset Request - Matson Brothers Painting',
      html: htmlBody,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send email verification email with secure link
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Raw verification token (not hashed)
 * @param {string} userName - User's first name or username
 */
export const sendVerificationEmail = async (email, verificationToken, userName) => {
  try {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Determine the verification URL based on environment
    const verifyUrl = isDevelopment
      ? `http://localhost:5174/account/verify?token=${verificationToken}`
      : `https://billing.matsonbrotherspainting.com/account/verify?token=${verificationToken}`;

    // Generate HTML email with company branding
    const htmlBody = `
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
          <h2 style="margin: 0 0 4px; font-size: 20px">Verify Your Email Address</h2>
          <p style="margin: 0; font-size: 14px">
            Matson Brothers Painting - Account Setup
          </p>
        </div>

        <div style="padding: 22px">
          <p style="margin: 0 0 12px; color: #1f365c">Hello ${userName},</p>

          <p style="margin: 0 0 16px; color: #334357">
            Thank you for registering with Matson Brothers Painting.
            To complete your account setup, please verify your email address by clicking the button below.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a
              href="${verifyUrl}"
              style="
                display: inline-block;
                background: #1f365c;
                color: #ffffff;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              "
            >Verify Email Address</a>
          </div>

          <div
            style="
              background: #e6f3ff;
              border: 1px solid #4a9eff;
              border-radius: 8px;
              padding: 14px;
              margin: 20px 0;
              color: #1f365c;
              font-size: 14px;
            "
          >
            <strong style="display: block; margin-bottom: 6px">ℹ️ Important</strong>
            This verification link will expire in <strong>24 hours</strong>.
            If you didn't create an account with Matson Brothers Painting, you can safely ignore this email.
          </div>

          <p style="margin: 0 0 12px; color: #334357; font-size: 14px">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 0 0 16px; color: #1f365c; font-size: 13px; word-break: break-all">
            ${verifyUrl}
          </p>

          <p style="margin: 20px 0 0; color: #334357">
            Thank you,<br />
            <strong>Matson Brothers Painting</strong>
          </p>

          ${
            isDevelopment
              ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">
                  <em>This is a development email. In production, this would be sent to: ${email}</em>
                </p>`
              : ''
          }
        </div>
      </div>
    `;

    // Create transporter
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: `Matson Brothers Painting <${process.env.EMAIL_FROM}>`,
      to: isDevelopment ? process.env.DEV_EMAIL_TO : email,
      subject: 'Verify Your Email - Matson Brothers Painting',
      html: htmlBody,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};
