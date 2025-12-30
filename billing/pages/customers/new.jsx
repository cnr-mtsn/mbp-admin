import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_CUSTOMER } from '../../lib/graphql/mutations';
import { extractUuid } from '../../lib/utils/gid';
import styles from '../../styles/pages.module.css';
import BackButton from '../../components/ui/BackButton';

export default function NewCustomer() {
  const router = useRouter();
  const [createCustomer, { loading }] = useMutation(CREATE_CUSTOMER, {
    refetchQueries: ['GetCustomers'],
  });

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const result = await createCustomer({
        variables: {
          input: {
            name: formData.name.trim(),
            company_name: formData.company_name.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            city: formData.city.trim() || null,
            state: formData.state.trim() || null,
            zip: formData.zip.trim() || null,
          },
        },
      });

      const newCustomerId = extractUuid(result.data.createCustomer.id);
      router.push(`/customers/${newCustomerId}`);
    } catch (err) {
      console.error('Error creating customer:', err);
      alert('Failed to create customer: ' + err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>New Customer</p>
          <h2 className={styles.pageTitle}>Add Customer</h2>
        </div>
        <BackButton href="/customers" classes="btn-secondary" />
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Contact Information</h3>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Customer name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Company name (optional)"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="email@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Address</h3>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Street Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="123 Main St"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="City"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="MO"
                maxLength={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ZIP Code</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="63101"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
