import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_EXPENSE } from '../../lib/graphql/mutations';
import { extractUuid } from '../../lib/utils/gid';
import styles from '../../styles/pages.module.css';
import BackButton from '../../components/ui/BackButton';
import ExpenseForm from '../../components/expense/ExpenseForm';

export default function NewExpense() {
  const router = useRouter();
  const [createExpense, { loading }] = useMutation(CREATE_EXPENSE);

  const handleSubmit = async (expenseData) => {
    try {
      const result = await createExpense({
        variables: {
          input: expenseData,
        },
      });

      const newExpenseId = extractUuid(result.data.createExpense.id);
      router.push(`/expenses/${newExpenseId}`);
    } catch (err) {
      console.error('Error creating expense:', err);
      alert('Failed to create expense: ' + err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>New Expense</p>
          <h2 className={styles.pageTitle}>Add Manual Expense</h2>
          <p className={styles.pageDescription}>
            Create a new expense record for labor or materials
          </p>
        </div>
        <BackButton href="/expenses" classes="btn-secondary" />
      </div>

      <div className="card">
        <ExpenseForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/expenses')}
          submitLabel={loading ? 'Creating...' : 'Create Expense'}
        />
      </div>
    </div>
  );
}
