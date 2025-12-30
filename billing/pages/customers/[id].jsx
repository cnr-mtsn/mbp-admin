import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import { useState, useRef, useEffect } from 'react';
import { GET_CUSTOMER } from '../../lib/graphql/queries';
import { UPDATE_CUSTOMER } from '../../lib/graphql/mutations';
import { toGid } from '../../lib/utils/gid';
import { formatCustomerName, formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import InvoicesGrid from '../../components/invoice/InvoicesGrid'
import JobsGrid from '../../components/jobs/JobsGrid'
import BackButton from '../../components/ui/BackButton'
import Loading from '../../components/ui/Loading'
import Icon from '../../components/ui/Icon'

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [jobsToShow, setJobsToShow] = useState(10);
  const [invoicesToShow, setInvoicesToShow] = useState(10);
  const [showEditModal, setShowEditModal] = useState(false);
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
  const dialogRef = useRef(null);

  const { data, loading, error, fetchMore, refetch } = useQuery(GET_CUSTOMER, {
    variables: {
      id: id ? toGid('Customer', id) : null,
      jobsFirst: jobsToShow,
      invoicesFirst: invoicesToShow,
    },
    skip: !id,
    notifyOnNetworkStatusChange: false,
  });

  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_CUSTOMER);

  // Sync form data when customer data loads or modal opens
  useEffect(() => {
    if (data?.customer && showEditModal) {
      setFormData({
        name: data.customer.name || '',
        company_name: data.customer.company_name || '',
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        address: data.customer.address || '',
        city: data.customer.city || '',
        state: data.customer.state || '',
        zip: data.customer.zip || '',
      });
    }
  }, [data?.customer, showEditModal]);

  // Handle dialog open/close
  useEffect(() => {
    if (showEditModal && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, [showEditModal]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      await updateCustomer({
        variables: {
          id: toGid('Customer', id),
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
      setShowEditModal(false);
      refetch();
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading customer</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const customer = data?.customer;

  if (!customer) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Customer not found</h1>
        </div>
      </div>
    );
  }

  // Filter invoices for this customer
  const customerId = toGid('Customer', id);
  const allInvoices = customer?.invoices || [];
  const customerInvoices = allInvoices.filter(invoice => invoice.customer_id === customerId);

  // Get customer jobs
  const customerJobs = customer?.jobs || [];

  // Calculate total unpaid balance for this customer
  const unpaidBalance = customerInvoices
    .filter(invoice => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  // Handle load more for jobs
  const handleLoadMoreJobs = () => {
    const scrollPosition = window.scrollY;
    const newJobsToShow = jobsToShow + 10;
    setJobsToShow(newJobsToShow);
    fetchMore({
      variables: {
        jobsFirst: newJobsToShow,
        invoicesFirst: invoicesToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  // Handle load more for invoices
  const handleLoadMoreInvoices = () => {
    const scrollPosition = window.scrollY;
    const newInvoicesToShow = invoicesToShow + 10;
    setInvoicesToShow(newInvoicesToShow);
    fetchMore({
      variables: {
        jobsFirst: jobsToShow,
        invoicesFirst: newInvoicesToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  // Determine if there are more items to load
  const hasMoreJobs = customerJobs.length === jobsToShow;
  const hasMoreInvoices = customerInvoices.length === invoicesToShow;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Customer</p>
          <h2 className={styles.pageTitle}>{formatCustomerName(customer)}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-secondary"
            title="Edit Customer"
          >
            <Icon name="edit" size={10} />
          </button>
          <BackButton href="/customers" classes="btn-secondary" title="Back to all customers" />
        </div>
      </div>

      <div className={`card ${cardStyles.detailSection}`}>
        <h3 className={cardStyles.detailSectionTitle}>Contact Information</h3>
        <dl className={styles.detailGrid}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Name</dt>
              <dd className={cardStyles.detailValue}>{formatCustomerName(customer)}</dd>
            </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Email</dt>
            <dd className={cardStyles.detailLink}>
              <a href={`mailto:${customer.email}`}>
                {customer.email}
              </a>
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Phone</dt>
            <dd className={cardStyles.detailLink}>
              <a href={`tel:${customer.phone}`}>
                {customer.phone}
              </a>
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Address</dt>
            <dd className={cardStyles.detailValue}>
              {customer.address && (
                <>
                  {customer.address}
                  <br />
                  {customer.city}, {customer.state} {customer.zip}
                </>
              )}
              {!customer.address && '-'}
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Created</dt>
            <dd className={cardStyles.detailValue}>
              {formatDate(customer.created_at)}
            </dd>
          </div>
          {customer.updated_at && (
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Last Updated</dt>
              <dd className={cardStyles.detailValue}>
                {formatDate(customer.updated_at)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Jobs Section */}
      <div className="mt-12">
        <h3 className={`${cardStyles.detailSectionTitle} mb-6`}>
          Jobs
        </h3>

        {!loading && customerJobs.length > 0 && (
          <JobsGrid
            jobs={customerJobs}
            showFilters={true}
            showSort={true}
            onLoadMore={handleLoadMoreJobs}
            hasMore={hasMoreJobs}
            loading={loading}
          />
        )}

        {!loading && customerJobs.length === 0 && (
          <div className={`card ${styles.emptyState}`}>
            <p className="muted">No jobs for this customer yet.</p>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="mt-12">
        <h3 className={`${cardStyles.detailSectionTitle} mb-6`}>
          Invoices
        </h3>

        {!loading && customerInvoices.length > 0 && (
          <>
            {/* Total Unpaid Balance */}
            {unpaidBalance > 0 && (
              <div className={`card ${styles.cardSpacing}`}>
                <div className={`${styles.summaryCardItem} py-4`}>
                  <p className={styles.summaryCardLabel}>
                    Unpaid Balance
                  </p>
                  <p className={`text-3xl font-semibold ${styles.summaryValueLoss}`}>
                    {formatMoney(unpaidBalance)}
                  </p>
                </div>
              </div>
            )}

            <InvoicesGrid
              invoices={customerInvoices}
              onLoadMore={handleLoadMoreInvoices}
              hasMore={hasMoreInvoices}
              loading={loading}
            />
          </>
        )}

        {!loading && customerInvoices.length === 0 && (
          <div className={`card ${styles.emptyState}`}>
            <p className="muted">No invoices for this customer yet.</p>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <dialog ref={dialogRef} className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Edit Customer</h3>
            <button onClick={() => setShowEditModal(false)} className={styles.modalClose}>
              <Icon name="close" size={10} />
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className={styles.modalBody}>
            <div className={styles.formSection}>
              <h4 className={styles.formSectionTitle}>Contact Information</h4>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
                    className={styles.formInput}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4 className={styles.formSectionTitle}>Address</h4>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Street Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
                disabled={updating}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
