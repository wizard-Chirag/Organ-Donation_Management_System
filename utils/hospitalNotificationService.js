const db = require('../config/db');

/**
 * Initializes and updates the notifications_hospital table schema.
 */
const initHospitalNotificationTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications_hospital (
                notification_h_id SERIAL PRIMARY KEY,
                hospital_id VARCHAR(255) NOT NULL REFERENCES hospital(hospital_id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT false,
                notification_type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Ensure optional helper columns exist
            ALTER TABLE notifications_hospital 
                ADD COLUMN IF NOT EXISTS request_type VARCHAR(50),
                ADD COLUMN IF NOT EXISTS reference_id INT,
                ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);

            -- Ensure check constraint allows Profile, Organ Request, Organ Listing, Medical Test, etc.
            ALTER TABLE notifications_hospital DROP CONSTRAINT IF EXISTS notifications_hospital_notification_type_check;
            ALTER TABLE notifications_hospital ADD CONSTRAINT notifications_hospital_notification_type_check 
                CHECK (notification_type IN ('Profile', 'Match', 'Medical Test', 'Transplant', 'Reminder', 'Information', 'Organ Request', 'Organ Listing'));

            CREATE INDEX IF NOT EXISTS idx_notif_hosp_id ON notifications_hospital(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_notif_hosp_read ON notifications_hospital(hospital_id, is_read);
        `);
        console.log("notifications_hospital table initialized/verified successfully.");
    } catch (err) {
        console.error("Error initializing notifications_hospital table:", err);
    }
};

/**
 * Creates a notification for a hospital.
 */
const createHospitalNotification = async ({
    hospital_id,
    user_id,
    title,
    message,
    notification_type = 'Profile',
    request_type,
    reference_id,
    action_url
}) => {
    try {
        // Prevent duplicate pending notifications for the same request

        // REFERENCE_ID IS NOTHING BUT THE PROFILE_ID FOR DONOR AND RECIPIENT OR or_id/do_id FOR THE ORGAN REQUESTS
        
        if (request_type && reference_id) {
            const existing = await db.query(
                `SELECT notification_h_id FROM notifications_hospital 
                 WHERE hospital_id = $1 AND request_type = $2 AND reference_id = $3 AND is_read = false`,
                [hospital_id, request_type, reference_id]
            );
            if (existing.rows.length > 0) {
                return existing.rows[0];
            }
        }

        const result = await db.query(
            `INSERT INTO notifications_hospital 
             (hospital_id, user_id, title, message, is_read, notification_type, request_type, reference_id, action_url, created_at)
             VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
                hospital_id,
                user_id,
                title.trim(),
                message.trim(),
                notification_type,
                request_type || null,
                reference_id || null,
                action_url || null
            ]
        );

        return result.rows[0];
    } catch (error) {
        console.error("Error creating hospital notification:", error);
        throw error;
    }
};

/**
 * Scans donor_profile, recipient_profile, donor_organ, and organ_request for 'Pending'
 * records belonging to the hospital, and generates notifications for any that are not yet recorded.
 * Also synchronizes and auto-marks resolved items as read.
 */
const syncHospitalNotifications = async (hospital_id) => {
    try {
        // 1. Donor Profile Requests (Pending)
        const pendingDonors = await db.query(`
            SELECT dp.donor_id, dp.user_id, dp.registered_hospital_id, dp.registered_at, u.name AS user_name
            FROM donor_profile dp
            JOIN users u ON dp.user_id = u.user_id
            WHERE dp.registered_hospital_id = $1 AND dp.verification_status = 'Pending'
        `, [hospital_id]);

        for (const row of pendingDonors.rows) {
            await createHospitalNotification({
                hospital_id: hospital_id,
                user_id: row.user_id,
                title: "New Donor Profile Request",
                message: `A new donor profile request has been made by ${row.user_name} (Donor ID: ${row.donor_id}).`,
                notification_type: "Profile",
                request_type: "donor_profile",
                reference_id: row.donor_id,
                action_url: "/hospital/profile-requests/donor"
            });
        }

        // 2. Recipient Profile Requests (Pending)
        const pendingRecipients = await db.query(`
            SELECT rp.recipient_id, rp.user_id, rp.registered_hospital_id, rp.registered_at, u.name AS user_name
            FROM recipient_profile rp
            JOIN users u ON rp.user_id = u.user_id
            WHERE rp.registered_hospital_id = $1 AND rp.verification_status = 'Pending'
        `, [hospital_id]);

        for (const row of pendingRecipients.rows) {
            await createHospitalNotification({
                hospital_id: hospital_id,
                user_id: row.user_id,
                title: "New Recipient Profile Request",
                message: `A new recipient profile request has been made by ${row.user_name} (Recipient ID: ${row.recipient_id}).`,
                notification_type: "Profile",
                request_type: "recipient_profile",
                reference_id: row.recipient_id,
                action_url: "/hospital/profile-requests/recipients"
            });
        }

        // 3. Donor Organ Listings (Pending)
        const pendingOrgans = await db.query(`
            SELECT d_o.do_id, d_o.donor_id, d_o.organ_id, d_o.verified_hospital_id, ot.organ_name, u.name AS user_name, u.user_id
            FROM donor_organ d_o
            JOIN donor_profile dp ON d_o.donor_id = dp.donor_id
            JOIN users u ON dp.user_id = u.user_id
            JOIN organ_type ot ON d_o.organ_id = ot.organ_id
            WHERE d_o.verified_hospital_id = $1 AND d_o.verification_status = 'Pending'
        `, [hospital_id]);

        for (const row of pendingOrgans.rows) {
            await createHospitalNotification({
                hospital_id: hospital_id,
                user_id: row.user_id,
                title: "New Donor Organ Listing",
                message: `A new donor organ listing for ${row.organ_name} has been made by ${row.user_name} (Listing ID: ${row.do_id}).`,
                notification_type: "Organ Request",
                request_type: "donor_organ",
                reference_id: row.do_id,
                action_url: "/hospital/donor_organ-listings"
            });
        }

        // 4. Recipient Organ Requests (Pending)
        const pendingRequests = await db.query(`
            SELECT orq.or_id, orq.recipient_id, orq.organ_id, orq.verified_hospital_id, ot.organ_name, u.name AS user_name, u.user_id
            FROM organ_request orq
            JOIN recipient_profile rp ON orq.recipient_id = rp.recipient_id
            JOIN users u ON rp.user_id = u.user_id
            JOIN organ_type ot ON orq.organ_id = ot.organ_id
            WHERE orq.verified_hospital_id = $1 AND orq.verification_status = 'Pending'
        `, [hospital_id]);

        for (const row of pendingRequests.rows) {
            await createHospitalNotification({
                hospital_id: hospital_id,
                user_id: row.user_id,
                title: "New Recipient Organ Request",
                message: `A new organ request for ${row.organ_name} has been made by ${row.user_name} (Request ID: ${row.or_id}).`,
                notification_type: "Organ Request",
                request_type: "organ_request",
                reference_id: row.or_id,
                action_url: "/hospital/organ-requests/list"
            });
        }

        // 5. Auto-mark done for items whose status in the underlying table is no longer 'Pending'
        // Donor profile resolved
        await db.query(`
            UPDATE notifications_hospital nh
            SET is_read = true
            FROM donor_profile dp
            WHERE nh.request_type = 'donor_profile'
              AND nh.reference_id = dp.donor_id
              AND dp.verification_status != 'Pending'
              AND nh.hospital_id = $1
              AND nh.is_read = false
        `, [hospital_id]);

        // Recipient profile resolved
        await db.query(`
            UPDATE notifications_hospital nh
            SET is_read = true
            FROM recipient_profile rp
            WHERE nh.request_type = 'recipient_profile'
              AND nh.reference_id = rp.recipient_id
              AND rp.verification_status != 'Pending'
              AND nh.hospital_id = $1
              AND nh.is_read = false
        `, [hospital_id]);

        // Donor organ resolved
        await db.query(`
            UPDATE notifications_hospital nh
            SET is_read = true
            FROM donor_organ d_o
            WHERE nh.request_type = 'donor_organ'
              AND nh.reference_id = d_o.do_id
              AND d_o.verification_status != 'Pending'
              AND nh.hospital_id = $1
              AND nh.is_read = false
        `, [hospital_id]);

        // Organ request resolved
        await db.query(`
            UPDATE notifications_hospital nh
            SET is_read = true
            FROM organ_request orq
            WHERE nh.request_type = 'organ_request'
              AND nh.reference_id = orq.or_id
              AND orq.verification_status != 'Pending'
              AND nh.hospital_id = $1
              AND nh.is_read = false
        `, [hospital_id]);

    } catch (error) {
        console.error("Error syncing hospital notifications:", error);
    }
};

/**
 * Retrieves notifications for a hospital.
 * By default retrieves unread (active) notifications, matching requirement:
 * "once the notification is marked as read/ action regarding the status is taken the notification is marked done and it is not displayed further more (yet stays in the database as read)"
 */
const getHospitalNotifications = async (hospital_id, { showAll = false } = {}) => {
    // Sync pending requests first to ensure up-to-date notifications
    await syncHospitalNotifications(hospital_id);

    const condition = showAll ? '' : 'AND is_read = false';
    const result = await db.query(`
        SELECT 
            notification_h_id,
            hospital_id,
            user_id,
            title,
            message,
            is_read,
            notification_type,
            COALESCE(request_type, '') AS request_type,
            reference_id,
            COALESCE(action_url, 
                CASE 
                    WHEN notification_type = 'Profile' AND title ILIKE '%recipient%' THEN '/hospital/profile-requests/recipients'
                    WHEN notification_type = 'Profile' THEN '/hospital/profile-requests/donor'
                    WHEN title ILIKE '%listing%' THEN '/hospital/donor_organ-listings'
                    ELSE '/hospital/organ-requests/list'
                END
            ) AS action_url,
            created_at
        FROM notifications_hospital
        WHERE hospital_id = $1 ${condition}
        ORDER BY created_at DESC
    `, [hospital_id]);

    return result.rows;
};

/**
 * Gets count of unread notifications for a hospital.
 */
const getHospitalUnreadCount = async (hospital_id) => {
    const result = await db.query(`
        SELECT COUNT(*)::int AS unread_count
        FROM notifications_hospital
        WHERE hospital_id = $1 AND is_read = false
    `, [hospital_id]);
    return result.rows[0]?.unread_count || 0;
};

/**
 * Marks a hospital notification as read.
 */
const markHospitalNotificationAsRead = async (notification_h_id, hospital_id) => {
    const result = await db.query(`
        UPDATE notifications_hospital
        SET is_read = true
        WHERE notification_h_id = $1 AND hospital_id = $2
        RETURNING notification_h_id
    `, [notification_h_id, hospital_id]);
    return result.rows.length > 0;
};

/**
 * Marks all notifications for a hospital as read.
 */
const markAllHospitalNotificationsAsRead = async (hospital_id) => {
    const result = await db.query(`
        UPDATE notifications_hospital
        SET is_read = true
        WHERE hospital_id = $1 AND is_read = false
        RETURNING notification_h_id
    `, [hospital_id]);
    return result.rowCount;
};

/**
 * Marks hospital notification as read when an action is taken on a request.
 */
const markNotificationDoneByRequest = async (hospital_id, request_type, reference_id) => {
    try {
        await db.query(`
            UPDATE notifications_hospital
            SET is_read = true
            WHERE hospital_id = $1 AND request_type = $2 AND reference_id = $3
        `, [hospital_id, request_type, reference_id]);
    } catch (e) {
        console.error("Error marking hospital notification done by request:", e);
    }
};

module.exports = {
    initHospitalNotificationTable,
    createHospitalNotification,
    syncHospitalNotifications,
    getHospitalNotifications,
    getHospitalUnreadCount,
    markHospitalNotificationAsRead,
    markAllHospitalNotificationsAsRead,
    markNotificationDoneByRequest
};
