import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatMoney, formatStatus } from "../../lib/utils/helpers"

export default function JobCard({ job }) {

    const statusStyles = {
      completed: styles.statusCompleted,
      in_progress: styles.statusInProgress,
      pending: styles.statusPending,
      paid: styles.statusPaid,
    };

    const statusClass = statusStyles[job.status] || statusStyles.pending;

    // Calculate realized profit based on payments received minus expenses
    const amountPaid = job.amount_paid || 0;
    const totalExpenses = job.total_expenses || 0;
    const realizedProfit = amountPaid - totalExpenses;
    const profitMargin = amountPaid > 0 ? (realizedProfit / amountPaid) * 100 : 0;
    const isProfitable = realizedProfit >= 0;

    // Warn if profit margin is suspiciously high (likely missing expenses)
    const SUSPICIOUS_MARGIN_THRESHOLD = 50;
    const hasSuspiciousMargin = amountPaid > 0 && profitMargin > SUSPICIOUS_MARGIN_THRESHOLD;

    return (
        <Link href={`/jobs/${extractUuid(job.id)}`} style={{ height: '100%' }}>
            <div className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Job</p>
                        <h4 className={cardStyles.itemTitle}>{job.title}</h4>
                        <h4 className={cardStyles.itemSubTitle}>{job.customer?.name || "Unassigned"}</h4>
                        <p className={cardStyles.itemDescription}>
                            {job.description || 'No description provided.'}
                        </p>
                    </div>
                    <span className={`pill ${statusClass}`}>{formatStatus(job.status) || 'pending'}</span>
                </div>

                <div className={cardStyles.itemTags}>
                    
                    <span className={cardStyles.itemTag}>
                        {job.payment_schedule || 'Schedule TBD'}
                    </span>
                </div>

                <div className={cardStyles.itemFooter} style={{ marginTop: 'auto' }}>
                    <div>
                        <p className={cardStyles.itemTitle}>
                            {formatMoney(job.total_amount || 0)}
                        </p>
                        <p className={cardStyles.itemDescription}>
                            Paid: {formatMoney(job.amount_paid || 0)}
                        </p>
                    </div>
                    <div>
                        <p className={cardStyles.itemTitle} style={{ color: isProfitable ? '#10b981' : '#ef4444' }}>
                            {isProfitable ? '+' : ''}{formatMoney(realizedProfit)}
                        </p>
                        <p className={cardStyles.itemDescription} style={{ display: 'flex', flexDirection: "column", alignItems: 'center', gap: '0.25rem' }}>
                            {profitMargin.toFixed(1)}% margin
                            {hasSuspiciousMargin && (
                                <span style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                    ⚠️ verify expenses
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    )
}
