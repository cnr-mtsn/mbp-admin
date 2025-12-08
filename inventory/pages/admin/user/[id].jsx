import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Button,
  Badge,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  Alert,
  Loading
} from '../../../components/ui';
import { adminAPI } from '../../../api/client';
import { formatDate, formatFullName, getInitials } from '../../../utils/helpers';
import styles from '../../../styles/admin-user.module.css';
import useAuthStore from '../../../store/authStore'

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }
];

export default function AdminUserProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const userRole = useAuthStore((state) => state.user?.role);


  useEffect(() => {
    if (!router.isReady || !id) return;
    loadUser(id);
  }, [router.isReady, id]);

  const loadUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getUserById(userId);
      setUser(response.data);
      setFormData({
        username: response.data.username || '',
        email: response.data.email || '',
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        role: response.data.role || 'employee'
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user');
      console.error('Load user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await adminAPI.updateUser(id, formData);
      setUser(response.data.user);
      setSuccess('User updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
      console.error('Update user error:', err);
    } finally {
      setSaving(false);
    }
  };

  const refreshProfile = () => {
    if (id && !saving) {
      loadUser(id);
    }
  };

  const displayName = useMemo(() => (user ? formatFullName(user) : ''), [user]);
  const initials = useMemo(() => (user ? getInitials(user) : ''), [user]);

  if(userRole !== "admin") return null


  if (loading) {
    return (
      <div className="page">
        <Loading message="Loading user profile..." />
      </div>
    );
  }

  if (!id) {
    return (
      <div className="page">
        <div className="alert alert-danger">User ID is missing.</div>
        <Link href="/admin/users" className="btn btn-outline mt-md">
          Back to users
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="alert alert-danger">{error || 'User not found'}</div>
        <Link href="/admin/users" className="btn btn-outline mt-md">
          Back to users
        </Link>
      </div>
    );
  }

  const badgeVariant =
    user.role === 'admin' ? 'success' : user.role === 'manager' ? 'warning' : 'gray';

  return (
    <div className="page">
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">Manage User</h1>
          <p className={styles.subtitle}>
            Review the profile and adjust access levels for this account.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/users" className="btn btn-outline btn-sm">
            Back to users
          </Link>
          <Button variant="outline" size="sm" onClick={refreshProfile} disabled={saving}>
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.layout}>
        <Card className={styles.profileCard}>
          <CardBody>
            <div className={styles.profileHeader}>
              <div className="avatar">{initials}</div>
              <div>
                <p className={styles.profileName}>{displayName}</p>
                <p className={styles.username}>@{user.username}</p>
                <Badge variant={badgeVariant}>{user.role}</Badge>
              </div>
            </div>

            <div className={styles.metaGrid}>
              <div>
                <p className={styles.label}>Email</p>
                <p className={styles.metaValue}>{user.email}</p>
              </div>
              <div>
                <p className={styles.label}>Created</p>
                <p className={styles.metaValue}>{formatDate(user.created_at)}</p>
              </div>
              <div>
                <p className={styles.label}>Last Updated</p>
                <p className={styles.metaValue}>{formatDate(user.updated_at)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className={styles.form}>
              <Alert variant="danger">{error}</Alert>
              <Alert variant="success">{success}</Alert>

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

              <FormGroup>
                <FormLabel htmlFor="role" required>Role</FormLabel>
                <FormSelect
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>

              <div className={styles.formActions}>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
