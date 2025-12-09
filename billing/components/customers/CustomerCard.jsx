import Link from "next/link"
import { extractUuid } from "../../lib/utils/gid"
import { formatDate } from "../../lib/utils/helpers"

import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import Icon from "../ui/Icon"


export default function CustomerCard({ customer }) {

    const phone = customer.phone || null;
    const location = customer.city && customer.state ? `${customer.city}, ${customer.state}` : null;
    return (
        <Link href={`/customers/${extractUuid(customer.id)}`} style={{ height: '100%' }}>
            <div key={customer.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '200px' }}>
                <div className={cardStyles.itemHeader}>
                    <div className={cardStyles.itemHeaderContent}>
                        <p className={cardStyles.itemLabel}>Customer</p>
                        <h3 className={cardStyles.itemTitle}>{customer.name}</h3>
                        <p className={cardStyles.itemDescription}>{customer.email || 'No email provided'}</p>
                    </div>
                    <div className="pill-primary">
                        {customer.city || customer.state ? 'Active' : 'New'}
                    </div>
                </div>

                <div className={cardStyles.itemContact} style={{ minHeight: '3rem', flex: '1 0 auto' }}>
                    {phone && <p className={cardStyles.itemContactText}>
                        <Icon name="phone"  size={6}/>{phone}
                    </p>}
                    {location && <p className={cardStyles.itemContactText}>
                        <Icon name="map-pin" size={6} /> {location}
                    </p>}
                </div>

                <div className={cardStyles.itemFooter} style={{ marginTop: 'auto' }}>
                    <span className={cardStyles.itemFooterText}>
                        Joined {customer.created_at ? formatDate(customer.created_at) : '-'}
                    </span>
                </div>
            </div>
        </Link>
    )
}