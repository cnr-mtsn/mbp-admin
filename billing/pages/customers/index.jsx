import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMERS } from '../../lib/graphql/queries';
import styles from '../../styles/pages.module.css';
import CustomersGrid from '../../components/customers/CustomersGrid'
import BackButton from '../../components/ui/BackButton'

export default function Customers() {
  const router = useRouter();

  const { data, loading, error } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading customers...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading customers</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const customers = data?.customers || [];

  

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Directory</p>
          <h2 className={styles.pageTitle}>Customers</h2>
        </div>
        <BackButton href="/" classes="btn-secondary" />
      </div>
      <CustomersGrid customers={customers} />
    </div>
  );
}
