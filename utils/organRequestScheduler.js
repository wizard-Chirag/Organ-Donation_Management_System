const db = require('../config/db');

/**
 * Organ Request Lifecycle Scheduler
 * Runs periodically (called from app startup) to:
 *   1. Increment criticality_score +2 for Pending requests older than 1 day
 *   2. Expire (Renewal Required) Pending requests older than 3 days
 *   3. Auto-reject requests that have hit 3 renewal cycles
 */
const runOrganRequestScheduler = async () => {
    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN');

        const now = new Date();

        // ── Step 1: Auto-reject requests that already reached request_count = 3
        //            and are still in "Renewal Required" state
        await client.query(`
            UPDATE organ_request
            SET
                verification_status = 'Rejected',
                rejection_reason    = 'Automatically rejected: maximum renewal cycles (3) reached without hospital approval.',
                updated_at          = NOW()
            WHERE verification_status = 'Renewal Required'
              AND request_count >= 3
        `);

        // ── Step 2: Expire Pending requests older than 3 days
        //            (move to "Renewal Required", increment request_count)
        //            Skip if already at request_count >= 3 (handled above)
        await client.query(`
            UPDATE organ_request
            SET
                verification_status = 'Renewal Required',
                request_count       = request_count + 1,
                updated_at          = NOW()
            WHERE verification_status = 'Pending'
              AND registered_at <= NOW() - INTERVAL '3 days'
              AND request_count < 3
        `);

        // ── Step 3: Increment criticality_score +2 for Pending requests
        //            older than 1 day (but not yet expired i.e. < 3 days)
        //            We use a per-day bucket: score = floor(hours_since_register / 24) * 2
        //            capped to avoid going above 10 before expiry
        await client.query(`
            UPDATE organ_request
            SET
                criticality_score = LEAST(
                    10,
                    FLOOR(EXTRACT(EPOCH FROM (NOW() - registered_at)) / 86400) * 2
                )::INTEGER,
                updated_at = NOW()
            WHERE verification_status = 'Pending'
              AND registered_at <= NOW() - INTERVAL '1 day'
              AND registered_at > NOW() - INTERVAL '3 days'
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
