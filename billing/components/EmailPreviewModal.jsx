import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { PREVIEW_INVOICE_EMAIL } from '../lib/graphql/queries';
import { extractUuid } from '../lib/utils/gid';
import Icon from './ui/Icon';
import styles from '../styles/emailPreviewModal.module.css';

export default function EmailPreviewModal({ invoice, isOpen, onClose, onSend }) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState(['']);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Fetch email preview data using GraphQL
  const { data, loading, error } = useQuery(PREVIEW_INVOICE_EMAIL, {
    variables: { id: invoice?.id },
    skip: !isOpen || !invoice,
  });

  // Update state when preview data loads
  useEffect(() => {
    if (data?.previewInvoiceEmail) {
      const preview = data.previewInvoiceEmail;
      setRecipientEmail(preview.to || '');
      setCcEmails(preview.cc.length > 0 ? preview.cc : ['']);
      setSubject(preview.subject || '');
      setBody(preview.body || '');
    }
  }, [data]);

  const handleAddCcEmail = () => {
    setCcEmails([...ccEmails, '']);
  };

  const handleRemoveCcEmail = (index) => {
    const newCcEmails = ccEmails.filter((_, i) => i !== index);
    setCcEmails(newCcEmails.length > 0 ? newCcEmails : ['']);
  };

  const handleCcEmailChange = (index, value) => {
    const newCcEmails = [...ccEmails];
    newCcEmails[index] = value;
    setCcEmails(newCcEmails);
  };

  const handleSend = async () => {
    try {
      setSending(true);

      // Filter out empty CC emails
      const filteredCcEmails = ccEmails.filter(email => email.trim() !== '');

      const result = await onSend({
        recipientEmail,
        ccEmails: filteredCcEmails,
        subject,
        body, // Send the original HTML body
      });

      if (result) {
        onClose();
      }
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(false);
    }
  };

  const getPdfPreviewUrl = () => {
    if (!invoice) return '';
    // Pass the full GID - backend will handle the conversion
    // Encode the GID for URL safety (it contains :// which needs encoding)
    const encodedInvoiceId = encodeURIComponent(invoice.id);
    const token = localStorage.getItem('token');
    // Use the GraphQL URL base (remove /graphql) to get the API base
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const apiBaseUrl = graphqlUrl.replace('/graphql', '');
    return `${apiBaseUrl}/api/invoices/${encodedInvoiceId}/preview-pdf?token=${token}`;
  };

  const handleDownloadPdf = () => {
    const url = getPdfPreviewUrl();
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Preview & Send Invoice Email</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading email preview...</div>
        ) : error ? (
          <div className={styles.loading}>Error loading preview: {error.message}</div>
        ) : (
          <>
            <div className={styles.modalBody}>
              {/* Recipient Email */}
              <div className={styles.formGroup}>
                <label htmlFor="recipient">To:</label>
                <input
                  id="recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={styles.input}
                  placeholder="recipient@example.com"
                />
              </div>

              {/* CC Emails */}
              <div className={styles.formGroup}>
                <label>CC:</label>
                <div className={styles.ccContainer}>
                  {ccEmails.map((email, index) => (
                    <div key={index} className={styles.ccInputRow}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleCcEmailChange(index, e.target.value)}
                        className={styles.input}
                        placeholder="cc@example.com"
                      />
                      {ccEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCcEmail(index)}
                          className={styles.removeButton}
                        >
                          <Icon name="x" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddCcEmail}
                    className={styles.addButton}
                  >
                    <Icon name="plus" /> Add CC
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className={styles.formGroup}>
                <label htmlFor="subject">Subject:</label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={styles.input}
                />
              </div>

              {/* Body */}
              <div className={styles.formGroup}>
                <label htmlFor="body">Message Preview:</label>
                <div className={styles.bodyPreview}>
                  <div
                    className={styles.emailPreview}
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                  <div className={styles.previewToggle}>
                    <small>Email will be sent with this content. To customize the message, you can edit the subject line above.</small>
                  </div>
                </div>
              </div>

              {/* PDF Preview Section */}
              <div className={styles.formGroup}>
                <div className={styles.pdfSection}>
                  <div className={styles.pdfButtons}>
                    <button
                      type="button"
                      onClick={() => setShowPdfPreview(!showPdfPreview)}
                      className="btn-secondary-sm"
                    >
                      <Icon name={showPdfPreview ? "eye-off" : "eye"} />
                      {showPdfPreview ? 'Hide' : 'Show'} PDF Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="btn-secondary-sm"
                    >
                      <Icon name="download" /> Download PDF
                    </button>
                  </div>

                  {showPdfPreview && (
                    <div className={styles.pdfPreview}>
                      <iframe
                        src={getPdfPreviewUrl()}
                        title="Invoice PDF Preview"
                        className={styles.pdfIframe}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="btn-primary"
                disabled={sending || !recipientEmail}
              >
                {sending ? (
                  <p className="flex items-center gap-1">
                    <Icon name="loader" className="spin" /> Sending...
                  </p>
                ) : (
                  <p className="flex items-center gap-1">
                    <Icon name="send" /> Send
                  </p>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
