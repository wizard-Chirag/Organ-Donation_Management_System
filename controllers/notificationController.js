const {
    getUserNotifications,
    getUnreadNotificationCount,
    markAsRead,
    markAllAsRead
} = require('../utils/notificationService');

/**
 * Render notifications page for the authenticated user.
 */
const getNotificationsPage = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const notifications = await getUserNotifications(userId, { limit: 100 });
        const unreadCount = await getUnreadNotificationCount(userId);

        res.render('user_notifications', {
            notifications,
            unreadCount,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading notifications page:", error);
        res.status(500).send("Internal Server Error loading notifications.");
    }
};

/**
 * Mark a single notification as read.
 */
const markSingleNotificationRead = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const notificationId = parseInt(req.params.id, 10);

        if (!notificationId) {
            if (req.is('json') || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, message: 'Invalid notification ID' });
            }
            return res.redirect('/notifications');
        }

        const updated = await markAsRead(notificationId, userId);

        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, updated });
        }
        res.redirect('/notifications');
    } catch (error) {
        console.error("Error marking notification as read:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.redirect('/notifications');
    }
};

/**
 * Mark all notifications as read for current user.
 */
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const updatedCount = await markAllAsRead(userId);

        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, count: updatedCount });
        }
        res.redirect('/notifications');
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.redirect('/notifications');
    }
};

/**
 * API: Get notifications and unread count in JSON.
 */
const getNotificationsApi = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const notifications = await getUserNotifications(userId, { limit: 50 });
        const unreadCount = await getUnreadNotificationCount(userId);

        res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error("Error fetching notifications via API:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getNotificationsPage,
    markSingleNotificationRead,
    markAllNotificationsRead,
    getNotificationsApi
};
