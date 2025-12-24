import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import { extractUuid } from "../../lib/utils/gid"
import { formatCustomerName, formatMoney, formatStatus } from "../../lib/utils/helpers"
import { getJobStatusClass } from "../../lib/utils/statusStyles"

export default function JobCard({ job }) {

    const statusClass = getJobStatusClass(job.status);

    // Calculate realized profit based on payments received minus expenses
    const amountPaid = job.amount_paid || job.total_amount || 0;
    const totalExpenses = job.total_expenses || 0;
    const realizedProfit = amountPaid - totalExpenses;
    const profitMargin = amountPaid > 0 ? (realizedProfit / amountPaid) * 100 : 0;
    const isProfitable = realizedProfit >= 0;

    // Warn if profit margin is suspiciously high (likely missing expenses)
    const SUSPICIOUS_MARGIN_THRESHOLD = 50;
    const hasSuspiciousMargin = amountPaid > 0 && profitMargin > SUSPICIOUS_MARGIN_THRESHOLD;

    return (
        <Link href={`/jobs/${extractUuid(job.id)}`} className="h-full block">
            <div className={cardStyles.lineItem}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Job</p>
                        <h4 className={cardStyles.itemTitle}>{job.title}</h4>
                        <h4 className={cardStyles.itemSubtitle}>{formatCustomerName(job.customer, "Unassigned")}</h4>
                        <p title={job.description} className={cardStyles.itemDescription}>
                            {job.description || 'No description provided.'}
                        </p>
                    </div>
                    <div className={cardStyles.itemTags}>
                        <span className={`pill ${statusClass}`}>{formatStatus(job.status) || 'pending'}</span>
                        {job.payment_schedule !== "100" && (
                            <span className={cardStyles.itemTag}>
                                {job.payment_schedule || 'Schedule TBD'}
                            </span>
                        )}
                    </div>
                </div>

                <div className={cardStyles.itemFooter}>
                    <div>
                        <p className={cardStyles.itemTitle}>
                            {formatMoney(job.total_amount || 0)}
                        </p>
                        <p className={cardStyles.itemDescription}>
                            Paid: {formatMoney(job.amount_paid || 0)}
                        </p>
                    </div>
                    <div>
                        <p className={`${cardStyles.itemTitle} ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isProfitable ? '+' : ''}{formatMoney(realizedProfit)}
                        </p>
                        <p className={`${cardStyles.itemDescription} flex flex-col items-center gap-1`}>
                            {profitMargin.toFixed(1)}% margin
                            {hasSuspiciousMargin && (
                                <span className="flex items-center gap-1 text-amber-500 text-xs">
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
