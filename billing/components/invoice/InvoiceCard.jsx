import Link from "next/link"
import { useRouter } from "next/router"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatCustomerName, formatDate, formatMoney, formatStatus } from "../../lib/utils/helpers"



export default function InvoiceCard({ invoice }) {
    const router = useRouter();

    const displayCustomerName = formatCustomerName(invoice.customer, 'No customer');
    const invoiceStatusStyles = {
      paid: styles.statusPaid,
      sent: styles.statusSent,
      overdue: styles.statusOverdue,
      draft: styles.statusDraft,
    };

    const invoiceClass = invoiceStatusStyles[invoice.status] || invoiceStatusStyles.draft;
    const paymentLink = (invoice.payments || []).find(payment =>
      (payment.invoices || []).some(pi => extractUuid(pi.invoice_id) === extractUuid(invoice.id))
    );

    const handlePaymentClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!paymentLink) return;
      router.push(`/payments/${extractUuid(paymentLink.id)}`);
    };

    // Calculate payment stage display
    const getPaymentStageDisplay = () => {
      if (!invoice.payment_stage || !invoice.job?.invoice_count) return null;

      const totalInvoices = invoice.job.invoice_count;

      // Don't show payment stage for single-payment jobs (100% schedule)
      if (totalInvoices === 1) return null;

      let currentPayment;
      if (invoice.payment_stage === 'start') {
        currentPayment = 1;
      } else if (invoice.payment_stage === 'touchup') {
        currentPayment = 3;
      } else if (invoice.payment_stage === 'completion') {
        // If 2 invoices total, completion is 2nd; if 3 invoices, completion is 2nd
        currentPayment = totalInvoices === 2 ? 2 : 2;
      } else {
        return null;
      }

      return `${currentPayment}/${totalInvoices}`;
    };

    const paymentStageDisplay = getPaymentStageDisplay();

    return (
        <Link href={`/invoices/${extractUuid(invoice.id)}`} style={{ height: '100%' }}>
            <div key={invoice.id} className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Invoice</p>
                        <h4 className={cardStyles.itemTitle}>{invoice.title}</h4>
                        <h4 className={cardStyles.itemSubtitle}>{displayCustomerName}</h4>
                    </div>
                    <div className={cardStyles.itemTags}>
                        <span className={`pill ${invoiceClass}`}>{formatStatus(invoice.status)}</span>
                        {paymentStageDisplay && (
                            <span style={{ backgroundColor: 'rgba(150, 150, 255, 0.5)', fontSize: ".7rem" }} className={cardStyles.itemTag}>
                                {paymentStageDisplay}
                            </span>
                        )}
                    </div>
                </div>

                <div className={cardStyles.itemFooter} style={{ marginTop: 'auto' }}>
                    <p className={cardStyles.itemTitle}>{formatMoney(invoice.total || 0)}</p>
                    {paymentLink ? (
                      <button
                        className="btn-secondary-sm"
                        onClick={handlePaymentClick}
                        title="View payment details"
                        type="button"
                      >
                        View Payment
                      </button>
                    ) : invoice.due_date && <p className={cardStyles.itemDescription}>Due {formatDate(invoice.due_date)}</p>}
                </div>
            </div>
        </Link>
    )
}
