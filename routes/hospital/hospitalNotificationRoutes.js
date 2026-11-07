const express = require('express');
const router = express.Router();
const { verifyHospitalToken } = require('../../middleware/verifytoken');
const {
    showHospitalNotificationsPage,
    markSingleHospitalNotification,
    markAllHospitalNotifications,
    getHospitalNotificationsApi
} = require('../../controllers/hospital/hospitalNotificationController');

// Hospital Notifications Page
router.get('/hospital/notifications', verifyHospitalToken, showHospitalNotificationsPage);

// Mark as read / done
router.post('/hospital/notifications/:id/read', verifyHospitalToken, markSingleHospitalNotification);
router.post('/hospital/notifications/read-all', verifyHospitalToken, markAllHospitalNotifications);

// API endpoints
router.get('/hospital/api/notifications', verifyHospitalToken, getHospitalNotificationsApi);
router.post('/hospital/api/notifications/:id/read', verifyHospitalToken, markSingleHospitalNotification);
router.post('/hospital/api/notifications/read-all', verifyHospitalToken, markAllHospitalNotifications);

module.exports = router;
