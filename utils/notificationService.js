const db = require('../config/db');

const ALLOWED_NOTIFICATION_TYPES = [
    'Profile',
    'Match',
    'Medical Test',
    'Transplant',
    'Reminder',
    'Information'
];

/**
 * Ensures the notifications table exists with proper schema and indexes.
 */
const initNotificationTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                notification_id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                notification_type VARCHAR(50) NOT NULL CHECK (
                    notification_type IN ('Profile', 'Match', 'Medical Test', 'Transplant', 'Reminder', 'Information')
                ),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        `);
        console.log("Notifications table initialized successfully.");
    } catch (err) {
        console.error("Error initializing notifications table:", err);
    }
};

/**
 * Creates a new notification for a specific user.
 * 
 * @param {Object} params
 * @param {number} params.user_id - Recipient user's ID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {string} [params.notification_type='Information'] - One of allowed notification types
 * @returns {Promise<Object>} The inserted notification row
 */
const createNotification = async ({ user_id, title, message, notification_type = 'Information' }) => {
    if (!user_id || !title || !message) {
        throw new Error("user_id, title, and message are required to create a notification.");
    }

    const safeType = ALLOWED_NOTIFICATION_TYPES.includes(notification_type)
        ? notification_type
        : 'Information';

    const result = await db.query(
        `INSERT INTO notifications (user_id, title, message, is_read, notification_type, created_at)
         VALUES ($1, $2, $3, false, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [user_id, title.trim(), message.trim(), safeType]
    );

    return result.rows[0];
};

/**
 * Retrieves notifications for a given user.
 * 
 * @param {number} user_id
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<Array>} Array of notification objects
 */
const getUserNotifications = async (user_id, { limit = 50, offset = 0 } = {}) => {
    const result = await db.query(
        `SELECT notification_id, user_id, title, message, is_read, notification_type, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [user_id, limit, offset]
    );
    return result.rows;
};

/**
 * Counts unread notifications for a user.
 * 
 * @param {number} user_id 
 * @returns {Promise<number>} Count of unread notifications
 */
const getUnreadNotificationCount = async (user_id) => {
    const result = await db.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = false`,
        [user_id]
    );
    return result.rows[0]?.unread_count || 0;
};

/**
 * Marks a specific notification as read.
 * 
 * @param {number} notification_id 
 * @param {number} user_id 
 * @returns {Promise<boolean>} Whether the notification was updated
 */
const markAsRead = async (notification_id, user_id) => {
    const result = await db.query(
        `UPDATE notifications
         SET is_read = true
         WHERE notification_id = $1 AND user_id = $2
         RETURNING notification_id`,
        [notification_id, user_id]
    );
    return result.rows.length > 0;
};

/**
 * Marks all notifications for a user as read.
 * 
 * @param {number} user_id 
 * @returns {Promise<number>} Number of updated rows
 */
const markAllAsRead = async (user_id) => {
    const result = await db.query(
        `UPDATE notifications
         SET is_read = true
         WHERE user_id = $1 AND is_read = false
         RETURNING notification_id`,
        [user_id]
    );
    return result.rowCount;
};

module.exports = {
    ALLOWED_NOTIFICATION_TYPES,
    initNotificationTable,
    createNotification,
    getUserNotifications,
    getUnreadNotificationCount,
    markAsRead,
    markAllAsRead
};
