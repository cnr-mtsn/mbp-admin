import { useState } from 'react';
import { Card, CardHeader, CardBody, Alert, Button, FormGroup, FormLabel, FormInput } from '../ui';
import { getFullName } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';
import styles from '../../styles/checkin-form.module.css';

export default function CheckoutForm({ onCheckout, loading, error }) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    employee_name: getFullName(user)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onCheckout(formData);
    if (success) {
      setFormData({
        employee_name: getFullName(user)
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="card-title">Check Out Product</h3>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Alert variant="danger">{error}</Alert>

          <FormGroup>
            <FormLabel htmlFor="employee_name" required>Your Name</FormLabel>
            <FormInput
              id="employee_name"
              name="employee_name"
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
              required
              readOnly={user.first_name && user.last_name}
            />
          </FormGroup>

          <Button type="submit" disabled={loading} variant="primary">
            {loading ? 'Checking out...' : 'Check Out'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
