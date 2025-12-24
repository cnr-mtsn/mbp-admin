import Link from "next/link"
import { extractUuid } from "../../lib/utils/gid"
import { formatCustomerName, formatDate, formatMoney } from "../../lib/utils/helpers"

import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import Icon from "../ui/Icon"


export default function CustomerCard({ customer }) {

    const phone = customer.phone || null;
    const location = customer.city && customer.state ? `${customer.city}, ${customer.state}` : null;
    const hasOpenInvoices = customer.open_invoice_count > 0;
    const outstandingBalance = customer.outstanding_balance || 0;

    return (
        <Link href={`/customers/${extractUuid(customer.id)}`} className="h-full block">
            <div key={customer.id} className={`card ${styles.cardFlexColumn}`}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Customer</p>
                        <h3 className={cardStyles.itemTitle}>{formatCustomerName(customer)}</h3>
                        <p className={cardStyles.itemDescription}>{customer.email || 'No email provided'}</p>
                    </div>
                    <div className="pill-primary">
                        {customer.city || customer.state ? 'Active' : 'New'}
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className={`${cardStyles.itemContact} ${styles.flexGrowSection}`}>
                        {phone && (
                            <p className={cardStyles.itemContactText}>
                                <Icon name="phone"  size={6}/>{phone}
                            </p>
                        )}
                        {location && (
                            <p className={cardStyles.itemContactText}>
                                <Icon name="map-pin" size={6} /> {location}
                            </p>
                        )}
                    </div>
                    <div className={`${cardStyles.itemContact} ${styles.flexGrowSection}`}>

                        {hasOpenInvoices && (
                            <p className={`${cardStyles.itemContactText} ${styles.overdueText}`}>
                                <Icon name="file-text" size={6} /> {customer.open_invoice_count} open invoice{customer.open_invoice_count !== 1 ? 's' : ''}
                            </p>
                        )}
                        {outstandingBalance > 0 && (
                            <p className={`${cardStyles.itemContactText} ${styles.overdueText}`}>
                                <Icon name="dollar-sign" size={6} /> {formatMoney(outstandingBalance)} outstanding
                            </p>
                        )}
                    </div>
                </div>

                <div className={cardStyles.itemFooter}>
                    <span className={cardStyles.itemFooterText}>
                        Joined {customer.created_at ? formatDate(customer.created_at) : '-'}
                    </span>
                </div>
            </div>
        </Link>
    )
}
