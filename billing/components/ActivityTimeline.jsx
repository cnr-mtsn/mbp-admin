import React from 'react';
import Icon from './ui/Icon';
import styles from './ActivityTimeline.module.css';

const activityIcons = {
  created: 'plus-circle',
  updated: 'edit',
  sent: 'send',
  viewed: 'eye',
  accepted: 'check-circle',
  rejected: 'x-circle'
};

const activityColors = {
  created: '#10b981', // green
  updated: '#3b82f6', // blue
  sent: '#8b5cf6', // purple
  viewed: '#6366f1', // indigo
  accepted: '#16a34a', // dark green
  rejected: '#dc2626'  // red
};

const activityLabels = {
  created: 'Created',
  updated: 'Updated',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Approved',
  rejected: 'Declined'
};

export default function ActivityTimeline({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className={styles.activityTimelineEmpty}>
        <Icon name="clock" size={16} />
        <p>No activity yet</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      console.warn('ActivityTimeline: missing created_at field');
      return 'Unknown';
    }

    let date;

    // Handle numeric timestamps (Unix timestamps)
    if (typeof dateString === 'number') {
      // If timestamp is in seconds (Unix timestamp), convert to milliseconds
      date = dateString < 10000000000 ? new Date(dateString * 1000) : new Date(dateString);
    }
    // Handle string timestamps or ISO strings
    else if (typeof dateString === 'string') {
      // Try parsing as a number first (string that contains a timestamp)
      const numericTimestamp = Number(dateString);
      if (!isNaN(numericTimestamp)) {
        // If it's a valid number, treat as timestamp
        date = numericTimestamp < 10000000000 ? new Date(numericTimestamp * 1000) : new Date(numericTimestamp);
      } else {
        // Otherwise parse as ISO string
        date = new Date(dateString);
      }
    }
    else {
      console.error('ActivityTimeline: unexpected date type:', typeof dateString, dateString);
      return 'Invalid date';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('ActivityTimeline: could not parse date:', dateString);
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    // if (diffDays < 7) return `${diffDays}d ago`;
    const overAYear = now.getFullYear() !== date.getFullYear();

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: overAYear ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return '';

    let date;

    // Handle numeric timestamps
    if (typeof dateString === 'number') {
      date = dateString < 10000000000 ? new Date(dateString * 1000) : new Date(dateString);
    }
    // Handle string timestamps or ISO strings
    else if (typeof dateString === 'string') {
      const numericTimestamp = Number(dateString);
      if (!isNaN(numericTimestamp)) {
        date = numericTimestamp < 10000000000 ? new Date(numericTimestamp * 1000) : new Date(numericTimestamp);
      } else {
        date = new Date(dateString);
      }
    }
    else {
      return '';
    }

    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={styles.activityTimeline}>
      <h3 className={styles.activityTimelineTitle}>Activity History</h3>
      <div className={styles.activityTimelineList}>
        {activities.map((activity, index) => (
          <div key={activity.id || index} className={styles.activityTimelineItem}>
            <div
              className={styles.activityTimelineIcon}
              style={{ backgroundColor: activityColors[activity.activity_type] }}
            >
              <Icon name={activityIcons[activity.activity_type] || 'circle'} size={12} />
            </div>
            <div className={styles.activityTimelineContent}>
              <div className={styles.activityTimelineHeader}>
                <span className={styles.activityTimelineAction}>
                  {activityLabels[activity.activity_type] || activity.activity_type}
                </span>
                <span className={styles.activityTimelineUser}>
                  by {activity.user_name || 'System'}
                </span>
              </div>
              <div className={styles.activityTimelineTime} title={formatFullDate(activity.created_at)}>
                {formatDate(activity.created_at)}
              </div>
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className={styles.activityTimelineMetadata}>
                  {activity.metadata.recipientEmail && (
                    <span className={styles.activityMetadataTag}>
                      To: {activity.metadata.recipientEmail}
                    </span>
                  )}
                  {activity.metadata.updatedFields && (
                    <span className={styles.activityMetadataTag}>
                      Changed: {activity.metadata.updatedFields.join(', ')}
                    </span>
                  )}
                  {activity.metadata.ip && activity.activity_type === 'viewed' && (
                    <span className={styles.activityMetadataTag}>
                      IP: {activity.metadata.ip}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
