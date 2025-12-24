import styles from '../../styles/pages.module.css';
import { useState } from 'react'
import { formatCustomerName } from '../../lib/utils/helpers'
import CustomerCard from './CustomerCard'
import EmptyState from '../ui/EmptyState'


export default function CustomersGrid({ customers }) {

    const [filter, setFilter] = useState(null)

    const handleFilterChange = e => setFilter(e.target.value)

    if(customers.length === 0) {
        return <EmptyState message="No customers found" />;
    }

    const filteredCustomers = !filter ? customers : customers.filter(customer => {
        const normalizedFilter = filter.toLowerCase();
        const displayName = formatCustomerName(customer, '').toLowerCase();
        return (
            displayName.includes(normalizedFilter) ||
            (customer.email && customer.email.toLowerCase().includes(normalizedFilter)) ||
            (customer.phone && customer.phone.toLowerCase().includes(normalizedFilter))
        );
    });

    if(filteredCustomers.length === 0) {
        return <EmptyState message="No customers match your search" />;
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
