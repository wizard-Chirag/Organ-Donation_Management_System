const db = require('../config/db');
const { createNotification } = require('./notificationService');
const { eraseHospitalNotificationByRequest } = require('./hospitalNotificationService');

/**
 * Organ Request Lifecycle Scheduler
 * Runs periodically to:
 *   1. Auto-expire Pending requests older than 3 days without hospital action:
 *      Sets status to 'Renewal Required', request_status = 'Expired',
 *      rejection_reason = "Renewal required, no action from hospital"
 *      Notifies user and clears hospital alert.
 *   2. Increment priority score (+2 per day) for Pending requests.
 */
const runOrganRequestScheduler = async () => {
    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN');

        const now = new Date();

        // ── Step 1: Find Pending requests older than 3 days that require auto-expiry
        const expiredRes = await client.query(`
            SELECT orq.or_id, orq.recipient_id, rp.user_id, ot.organ_name, h.hospital_name
            FROM organ_request orq
            JOIN recipient_profile rp ON orq.recipient_id = rp.recipient_id
            JOIN organ_type ot ON orq.organ_id = ot.organ_id
            JOIN hospital h ON orq.verified_hospital_id = h.hospital_id
            WHERE orq.verification_status = 'Pending'
              AND orq.registered_at <= NOW() - INTERVAL '3 days'
        `);

        if (expiredRes.rows.length > 0) {
            // Update expired requests
            await client.query(`
                UPDATE organ_request
                SET
                    verification_status = 'Renewal Required',
                    request_status      = 'Expired',
                    rejection_reason    = 'Renewal required, no action from hospital',
                    is_eligible_for_matching = FALSE,
                    updated_at          = NOW()
                WHERE verification_status = 'Pending'
                  AND registered_at <= NOW() - INTERVAL '3 days'
            `);

            // Clean hospital notifications & notify users
            for (const row of expiredRes.rows) {
                await eraseHospitalNotificationByRequest('organ_request', row.or_id);

                await createNotification({
                    user_id: row.user_id,
                    title: "Organ Request Auto-Expired (Renewal Required)",
                    message: `No action was taken by ${row.hospital_name} on your ${row.organ_name} request within 3 days. Your request is marked for renewal with an additional +5 priority score upon renewal.`,
                    notification_type: "Reminder"
                });
            }
        }

        // ── Step 2: Increment priority score (+2 per day) for Pending requests
        // Total priority score = criticality score for that organ + (days since registered_at * 2) + renewal_priority_bonus (+5 per renewal)
        await client.query(`
            UPDATE organ_request
            SET
                criticality_score = (
                    ot.criticality_score
                    + FLOOR(EXTRACT(EPOCH FROM (NOW() - organ_request.registered_at)) / 86400) * 2
                    + COALESCE(organ_request.renewal_priority_bonus, 0)
                )::INTEGER,
                updated_at = NOW()
            FROM organ_type ot
            WHERE organ_request.organ_id = ot.organ_id
              AND organ_request.verification_status = 'Pending'
        `);

        await client.query('COMMIT');
        console.log(`[Scheduler] Organ request lifecycle check completed at ${now.toISOString()}`);

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[Scheduler] Organ request scheduler error:', err);
    } finally {
        if (client) client.release();
    }
};

/**
 * Start the scheduler loop (runs every hour)
 */
const startOrganRequestScheduler = () => {
    // Run immediately on startup
    runOrganRequestScheduler();

    // Then every 60 minutes
    setInterval(runOrganRequestScheduler, 60 * 60 * 1000);

    console.log('[Scheduler] Organ request lifecycle scheduler started (runs every 60 min).');
};

module.exports = { startOrganRequestScheduler, runOrganRequestScheduler };
