import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { adminAPI } from '../../api/client';
import { Card, Loading, Button, CardHeader, CardBody, CardTitle, Badge } from '../../components/ui';
import styles from '../../styles/admin-users.module.css';
import { formatDate, formatFullName, getInitials, parseGid } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const userRole = useAuthStore((state) => state.user?.role);


  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Load all users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAdmins = useMemo(() => users.filter(user => user.role === 'admin').length, [users]);
  const totalEmployees = useMemo(
    () => users.filter(user => user.role !== 'admin').length,
    [users]
  );
  const lastCreatedUser = useMemo(() => {
    if (users.length === 0) return null;
    return users.reduce((latest, current) => {
      const latestTime = new Date(latest.created_at).getTime();
      const currentTime = new Date(current.created_at).getTime();
      return currentTime > latestTime ? current : latest;
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      if (!matchesRole) return false;

      if (!searchTerm) return true;
      const query = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(query)
      );
    });
  }, [users, roleFilter, searchTerm]);

  const uniqueRoles = useMemo(() => ['all', ...Array.from(new Set(users.map(user => user.role)))], [users]);

  const roleVariantMap = {
    admin: 'success',
    manager: 'warning',
    employee: 'gray'
  };

  if(userRole !== "admin") return null
  if (loading) {
    return (
      <div className="page">
        <Loading message="Loading users..." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className={styles.pageHeader}>
        <div>
          <h1 className="page-title">Team Directory</h1>
          <p className={styles.description}>
            View and manage access across your organization.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" onClick={loadAllUsers}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className={`alert alert-danger ${styles.errorMessage}`}>
          {error}
          <Button onClick={loadAllUsers} variant="outline" size="sm" className="mt-sm">
            Try again
          </Button>
        </div>
      )}

      {users.length > 0 && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Users</span>
            <span className={styles.statValue}>{users.length}</span>
            <span className={styles.statSubtext}>Across all roles</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Admins</span>
            <span className={styles.statValue}>{totalAdmins}</span>
            <span className={styles.statSubtext}>Full system access</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Team Members</span>
            <span className={styles.statValue}>{totalEmployees}</span>
            <span className={styles.statSubtext}>Non-admin collaborators</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Newest Member</span>
            <span className={styles.statValue}>
              {lastCreatedUser ? formatFullName(lastCreatedUser) : '—'}
            </span>
            <span className={styles.statSubtext}>
              {lastCreatedUser ? `Joined ${formatDate(lastCreatedUser.created_at)}` : 'No users yet'}
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className={styles.cardHeader}>
          <div>
            <CardTitle>Users</CardTitle>
          </div>
          <div className={styles.controlsBar}>
            <div className={styles.searchGroup}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search by name, username, or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <select
              className={styles.filterSelect}
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              {uniqueRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardBody>
          {filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              No users match your filters.
            </div>
          ) : (
            <div className={styles.usersList}>
              {filteredUsers.map((user) => (
                <Link key={user.id} href={`/admin/user/${parseGid(user.id)}`} className={styles.userRow}>
                  <div className={styles.rowPrimary}>
                    <div className={styles.userCell}>
                      <div className="avatar">{getInitials(user)}</div>
                      <div>
                        <p className={styles.name}>{formatFullName(user)}</p>
                        <p className={styles.username}>@{user.username}</p>
                      </div>
                    </div>
                    <Badge variant={roleVariantMap[user.role] || 'gray'}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className={styles.rowSecondary}>
                    <div className={styles.dateGroup}>
                      <p className={styles.label}>Email</p>
                      <p className={styles.email}>{user.email}</p>
                    </div>
                    <div className={styles.dateGroup}>
                      <p className={styles.label}>User Since</p>
                      <span>{formatDate(parseInt(user.created_at))}</span>
                    </div>
                    <div className={styles.dateGroup}>
                      <p className={styles.label}>Last Updated</p>
                      <span>{formatDate(parseInt(user.updated_at))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
