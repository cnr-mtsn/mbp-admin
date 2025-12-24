import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_JOB } from '../../lib/graphql/mutations';
import { GET_JOBS } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import JobForm from '../../components/JobForm';
import styles from '../../styles/pages.module.css';

export default function NewJob() {
  const router = useRouter();
  const [createJob, { loading, error }] = useMutation(CREATE_JOB, {
    refetchQueries: [{ query: GET_JOBS }],
    onCompleted: (data) => {
      const jobId = extractUuid(data.createJob.id);
      router.push(`/jobs/${jobId}`);
    },
  });

  const handleSubmit = (formData) => {
    createJob({
      variables: {
        input: formData
      }
    });
  };

  const handleCancel = () => {
    router.push('/jobs');
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Jobs</p>
          <h2 className={styles.pageTitle}>Create New Job</h2>
        </div>
      </div>

      {error && (
        <div className={styles.alertError}>
          Error creating job: {error.message}
        </div>
      )}

      <JobForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel={loading ? 'Creating...' : 'Create Job'}
      />
    </div>
  );
}
