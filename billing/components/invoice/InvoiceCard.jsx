import Link from "next/link"
import { useRouter } from "next/router"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatDate, formatMoney, formatStatus } from "../../lib/utils/helpers"



export default function InvoiceCard({ invoice }) {
    const router = useRouter();

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

    return (
        <Link href={`/invoices/${extractUuid(invoice.id)}`} style={{ height: '100%' }}>
            <div key={invoice.id} className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Invoice</p>
                        <h4 className={cardStyles.itemTitle}>{invoice.title}</h4>
                        <h4 className={cardStyles.itemSubtitle}>{invoice.customer?.name || 'No customer'}</h4>
                    </div>
                    <div className={cardStyles.itemTags}>
                        <span className={`pill ${invoiceClass}`}>{formatStatus(invoice.status)}</span>
                        {invoice.payment_stage && (
                            <span style={{ backgroundColor: 'rgba(150, 150, 255, 0.5)', fontSize: ".7rem" }} className={cardStyles.itemTag}>
                                {invoice.payment_stage === "start" ? "1/3" : invoice.payment_stage === "completion" ? "2/3" : invoice.payment_stage === "touchup" ? "3/3" : 'Payment stage TBD'}
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
