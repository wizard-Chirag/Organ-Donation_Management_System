const {
    getHospitalNotifications,
    getHospitalUnreadCount,
    markHospitalNotificationAsRead,
    markAllHospitalNotificationsAsRead
} = require('../../utils/hospitalNotificationService');
const db = require('../../config/db');

/**
 * Render the hospital notifications page with separate sections for:
 * 1. Profile Requests (Donor & Recipient)
 * 2. Organ Requests & Listings
 * 3. Test Result Updates (Medical Tests - for next phase)
 */
const showHospitalNotificationsPage = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;
        const showAll = req.query.view === 'history' || req.query.showAll === 'true';

        // Fetch active notifications (unread by default)
        const notifications = await getHospitalNotifications(hospital_id, { showAll: false });
        const unreadCount = await getHospitalUnreadCount(hospital_id);

        // Fetch historical read notifications if requested
        let historyNotifications = [];
        if (showAll) {
            const allNotifs = await getHospitalNotifications(hospital_id, { showAll: true });
            historyNotifications = allNotifs.filter(n => n.is_read);
        }

        // Fetch hospital details
        const hospResult = await db.query(
            `SELECT hospital_id, hospital_name, city FROM hospital WHERE hospital_id = $1`,
            [hospital_id]
        );
        const hospitalData = hospResult.rows[0] || req.hospital;

        // Categorize into separate sections
        const profileNotifications = notifications.filter(n => 
            n.notification_type === 'Profile' || 
            ['donor_profile', 'recipient_profile'].includes(n.request_type) ||
            n.title.toLowerCase().includes('profile')
        );

        const organNotifications = notifications.filter(n => 
            ['Organ Request', 'Organ Listing', 'Match', 'Transplant'].includes(n.notification_type) ||
            ['donor_organ', 'organ_request'].includes(n.request_type) ||
            n.title.toLowerCase().includes('organ')
        );

        const medicalTestNotifications = notifications.filter(n => 
            n.notification_type === 'Medical Test' || 
            n.request_type === 'medical_test' ||
            n.title.toLowerCase().includes('medical test')
        );

        res.render('hospital/hospitalNotifications', {
            hospital: hospitalData,
            notifications,
            profileNotifications,
            organNotifications,
            medicalTestNotifications,
            historyNotifications,
            unreadCount,
            activeTab: req.query.tab || 'all',
            viewMode: showAll ? 'history' : 'active'
        });

    } catch (error) {
        console.error("Error loading hospital notifications:", error);
        res.status(500).send("Internal Server Error loading hospital notifications.");
    }
};

/**
 * Mark a single notification as read / done.
 */
const markSingleHospitalNotification = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;
        const notification_h_id = parseInt(req.params.id, 10);

        if (!notification_h_id) {
            if (req.is('json') || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, message: 'Invalid notification ID' });
            }
            return res.redirect('/hospital/notifications');
        }

        const updated = await markHospitalNotificationAsRead(notification_h_id, hospital_id);

        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, updated });
        }
        res.redirect('/hospital/notifications');

    } catch (error) {
        console.error("Error marking hospital notification as read:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.redirect('/hospital/notifications');
    }
};

/**
 * Mark all notifications for the hospital as read / done.
 */
const markAllHospitalNotifications = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;
        const updatedCount = await markAllHospitalNotificationsAsRead(hospital_id);

        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, count: updatedCount });
        }
        res.redirect('/hospital/notifications');

    } catch (error) {
        console.error("Error marking all hospital notifications as read:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.redirect('/hospital/notifications');
    }
};

/**
 * API: Get JSON notifications and unread count for hospital.
 */
const getHospitalNotificationsApi = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;
        const notifications = await getHospitalNotifications(hospital_id, { showAll: false });
        const unreadCount = await getHospitalUnreadCount(hospital_id);

        res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error("Error in getHospitalNotificationsApi:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    showHospitalNotificationsPage,
    markSingleHospitalNotification,
    markAllHospitalNotifications,
    getHospitalNotificationsApi
};
