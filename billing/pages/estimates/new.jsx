import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_ESTIMATE } from '../../lib/graphql/mutations';
import { GET_ESTIMATES } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import EstimateForm from '../../components/EstimateForm';
import styles from '../../styles/pages.module.css';

export default function NewEstimate() {
  const router = useRouter();
  const [createEstimate, { loading, error }] = useMutation(CREATE_ESTIMATE, {
    refetchQueries: [{ query: GET_ESTIMATES }],
    onCompleted: (data) => {
      const estimateId = extractUuid(data.createEstimate.id);
      router.push(`/estimates/${estimateId}`);
    },
  });

  const handleSubmit = (formData) => {
    createEstimate({
      variables: {
        input: formData
      }
    });
  };

  const handleCancel = () => {
    router.push('/estimates');
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Estimates</p>
          <h2 className={styles.pageTitle}>Create New Estimate</h2>
        </div>
      </div>

      {error && (
        <div className={styles.alertError}>
          Error creating estimate: {error.message}
        </div>
      )}

      <EstimateForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel={loading ? 'Creating...' : 'Create Estimate'}
      />
    </div>
  );
}
