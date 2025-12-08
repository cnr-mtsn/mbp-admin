import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, FormGroup, FormLabel, FormInput, Alert } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/client';
import styles from '../../styles/profile.module.css';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate password change if attempted
    if (formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        setError('Current password is required to change password');
        setLoading(false);
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }
      if (formData.new_password.length < 6) {
        setError('New password must be at least 6 characters');
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name
      };

      // Add password fields if changing password
      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      const response = await authAPI.updateProfile(updateData);

      // Update local user data and token
      setUser(response.data.user);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      setSuccess('Profile updated successfully!');

      // Clear password fields
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">My Profile</h1>

      <div className={styles.container}>
        <Card>
          <CardHeader>
            <h3 className="card-title">Account Information</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className={styles.form}>
              <Alert variant="success">{success}</Alert>
              <Alert variant="danger">{error}</Alert>

              <FormGroup>
                <FormLabel htmlFor="username" required>Username</FormLabel>
                <FormInput
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="email" required>Email</FormLabel>
                <FormInput
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </FormGroup>

              <div className={styles.nameGrid}>
                <FormGroup>
                  <FormLabel htmlFor="first_name">First Name</FormLabel>
                  <FormInput
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel htmlFor="last_name">Last Name</FormLabel>
                  <FormInput
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </FormGroup>
              </div>

              <div className={styles.passwordSection}>
                <h4 className={styles.passwordTitle}>
                  Change Password
                </h4>
                <p className={styles.passwordHelp}>
                  Leave blank to keep current password
                </p>

                <FormGroup>
                  <FormLabel htmlFor="current_password">Current Password</FormLabel>
                  <FormInput
                    type="password"
                    id="current_password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                  />
                </FormGroup>

                <div className={styles.nameGrid}>
                  <FormGroup>
                    <FormLabel htmlFor="new_password">New Password</FormLabel>
                    <FormInput
                      type="password"
                      id="new_password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel htmlFor="confirm_password">Confirm New Password</FormLabel>
                    <FormInput
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                    />
                  </FormGroup>
                </div>
              </div>

              <div className={styles.formActions}>
                <Button type="submit" disabled={loading} variant="primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className={styles.roleInfo}>
          <div className={styles.roleText}>
            <strong>Role:</strong> {user?.role || 'user'}
          </div>
        </div>
      </div>
    </div>
  );
}
