import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatDate, formatMoney } from "../../lib/utils/helpers"



export default function InvoiceCard({ invoice }) {

    const invoiceStatusStyles = {
      paid: styles.statusPaid,
      sent: styles.statusSent,
      overdue: styles.statusOverdue,
      draft: styles.statusDraft,
    };

    const invoiceClass = invoiceStatusStyles[invoice.status] || invoiceStatusStyles.draft;

    return (
        <Link href={`/invoices/${extractUuid(invoice.id)}`} style={{ height: '100%' }}>
            <div key={invoice.id} className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Invoice</p>
                        <h4 className={cardStyles.itemTitle}>{invoice.title}</h4>
                        <p className={cardStyles.itemDescription}>{invoice.payment_stage || 'Payment stage'}</p>
                    </div>
                    <span className={`pill ${invoiceClass}`}>{invoice.status}</span>
                </div>

                <div className={cardStyles.itemFooter} style={{ marginTop: 'auto' }}>
                    <div>
                        <p className={cardStyles.itemTitle}>{formatMoney(invoice.total || 0)}</p>
                        {invoice.due_date && (
                            <p className={cardStyles.itemDescription}>Due {formatDate(invoice.due_date)}</p>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}