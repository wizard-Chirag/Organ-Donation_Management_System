const express = require('express');
const router = express.Router();
const { verifyUserToken } = require('../middleware/verifytoken');
const {
    getNotificationsPage,
    markSingleNotificationRead,
    markAllNotificationsRead,
    getNotificationsApi
} = require('../controllers/notificationController');

// Notifications UI Page
router.get('/notifications', verifyUserToken, getNotificationsPage);

// Mark all as read (Form submission / Web action)
router.post('/notifications/read-all', verifyUserToken, markAllNotificationsRead);

// Mark single notification as read (Form submission / Web action)
router.post('/notifications/:id/read', verifyUserToken, markSingleNotificationRead);

// JSON APIs for async / AJAX client-side calls
router.get('/api/notifications', verifyUserToken, getNotificationsApi);
router.post('/api/notifications/read-all', verifyUserToken, markAllNotificationsRead);
router.post('/api/notifications/:id/read', verifyUserToken, markSingleNotificationRead);

module.exports = router;
