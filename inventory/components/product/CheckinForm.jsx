import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Alert, Button, FormGroup, FormLabel, FormInput, FormSelect, FormHelper, FormCheckbox } from '../ui';
import FillLevelPicker from '../FillLevelPicker';
import { getFullName } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';
import styles from '../../styles/checkin-form.module.css';

export default function CheckinForm({ product, onCheckin, loading, error, hideEmployeeName = false }) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    employee_name: getFullName(user),
    container_size: product?.container_size || '',
    amount_decimal: '',
    mark_as_depleted: false
  });
  const isPaintOrStain = ['paint', 'stain'].includes(product?.product_type);

  useEffect(() => {
    if (product?.container_size) {
      setFormData(prev => ({
        ...prev,
        container_size: product.container_size
      }));
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onCheckin(formData);
    if (success) {
      setFormData({
        employee_name: getFullName(user),
        container_size: product?.container_size || '',
        amount_decimal: '',
        mark_as_depleted: false
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <h3 className="card-title">Check In Product</h3>
        <p className={styles.subtitle}>
          Add this product back to inventory
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Alert variant="danger">{error}</Alert>

          {!hideEmployeeName && (
            <FormGroup>
              <FormLabel htmlFor="checkin_employee_name" required>Your Name</FormLabel>
              <FormInput
                id="checkin_employee_name"
                name="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                required
                readOnly={user.first_name && user.last_name}
              />
            </FormGroup>
          )}

          {isPaintOrStain ? (
            <>
              <FormGroup>
                <FormLabel htmlFor="checkin_container_size" required>Container Size</FormLabel>
                <FormSelect
                  id="checkin_container_size"
                  name="container_size"
                  value={formData.container_size}
                  onChange={(e) => setFormData({ ...formData, container_size: e.target.value })}
                  required
                  disabled={!!product?.container_size}
                >
                  <option value="">Select size</option>
                  <option value="5gal">5 Gallon</option>
                  <option value="1gal">1 Gallon</option>
                  <option value="1qt">1 Quart</option>
                  <option value="gallon">Gallon</option>
                  <option value="quart">Quart</option>
                </FormSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="checkin_amount_decimal" required>Amount Remaining (0-1)</FormLabel>
                <FillLevelPicker
                  containerSize={formData.container_size}
                  value={formData.amount_decimal}
                  onChange={(newValue) => setFormData({ ...formData, amount_decimal: newValue })}
                />
                <FormHelper>Click to set the fill level, or enter a decimal between 0 and 1 (e.g., 0.5 for half full).</FormHelper>
                <FormInput
                  type="number"
                  id="checkin_amount_decimal"
                  name="amount_decimal"
                  value={formData.amount_decimal}
                  onChange={(e) => setFormData({ ...formData, amount_decimal: e.target.value })}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="e.g., 0.75 for 75% full"
                  required={!formData.mark_as_depleted}
                  disabled={formData.mark_as_depleted}
                />
                <FormHelper>Enter a decimal between 0 and 1 (e.g., 0.5 for half full), or mark as depleted below</FormHelper>
              </FormGroup>
            </>
          ) : (
            <p className={styles.helperText}>
              This item does not track volume. Checking it in will simply mark it available.
            </p>
          )}

          <FormCheckbox
            id="mark_as_depleted"
            checked={formData.mark_as_depleted}
            onChange={(e) => setFormData({ ...formData, mark_as_depleted: e.target.checked, amount_decimal: e.target.checked ? '0' : '' })}
            label="Product completely depleted"
            description="Check this if you used all of the paint and it should be removed from active inventory."
          />

          <Button type="submit" disabled={loading} variant="success">
            {loading ? 'Checking in...' : (formData.mark_as_depleted ? 'Check In as Depleted' : 'Check In')}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
