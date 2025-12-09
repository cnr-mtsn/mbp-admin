import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatMoney } from "../../lib/utils/helpers"

export default function JobCard({ job }) {

    const statusStyles = {
      completed: styles.statusCompleted,
      in_progress: styles.statusInProgress,
      pending: styles.statusPending,
      paid: styles.statusPaid,
    };

    const statusClass = statusStyles[job.status] || statusStyles.pending;

    return (
        <Link href={`/jobs/${extractUuid(job.id)}`} style={{ height: '100%' }}>
            <div className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Job</p>
                        <h4 className={cardStyles.itemTitle}>{job.title}</h4>
                        <p className={cardStyles.itemDescription}>
                            {job.description || 'No description provided.'}
                        </p>
                    </div>
                    <span className={`pill ${statusClass}`}>{job.status || 'pending'}</span>
                </div>

                <div className={cardStyles.itemTags}>
                    <span className={cardStyles.itemTag}>
                        {job.customer?.name || 'Unassigned customer'}
                    </span>
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
                </div>
            </div>
        </Link>
    )
}
