import Link from 'next/link'
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import { useState } from 'react'
import { formatDate } from '../../lib/utils/helpers'
import { extractUuid } from '../../lib/utils/gid'
import CustomerCard from './CustomerCard'


export default function CustomersGrid({ customers }) {
    
    const [filter, setFilter] = useState(null)

    const handleFilterChange = e => setFilter(e.target.value)

    if(customers.length === 0) {
        return (
            <div className={`card ${styles.emptyState}`}>
                <p className="muted">No customers found</p>
            </div>
        )
    }

    const filteredCustomers = !filter ? customers : customers.filter(customer =>
        customer.name.toLowerCase().includes(filter.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(filter.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(filter.toLowerCase())) 
    );

    if(filteredCustomers.length === 0) {
        return (
            <div className={`card ${styles.emptyState}`}>
                <p className="muted">No customers match your search</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="card">
                <label htmlFor="customer-search" className={styles.formLabel}>Search Customers</label>
                <input id="customer-search" className={styles.formInput} type="text" placeholder="Search..." value={filter || ''} onChange={handleFilterChange} />
            </div>
            <div className={styles.cardGrid}>
                {filteredCustomers.map((customer) => <CustomerCard key={customer.id} customer={customer} />)}
            </div>
        </div>
    )
}