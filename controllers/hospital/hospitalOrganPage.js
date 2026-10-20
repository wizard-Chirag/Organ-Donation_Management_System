const db = require('../../config/db')
const {comparePassword} = require('../../utils/passwords')
const path = require('path')
const fs = require('fs')
const showOrganDashboard = (req,res)=>{

    try {
        console.log("Hospital organ request approval page loaded")
        return res.render('organ_requests/organDashboard')
    } catch (error) {
        console.log(error)
    }

}
const showDonorOrganPage = async (req,res)=>{
    try {
        const search = (req.query.search || "").trim();
            const status = (req.query.status || "").trim();
            const organ = (req.query.organ || "").trim();
    
            const allowedStatuses = [
                "Pending Verification",
                "Available",
                "Reserved",
                "Used",
                "Withdrawn",
                "Rejected"
            ];
    
            if (status && !allowedStatuses.includes(status)) {
                return res.status(400).send("Invalid status filter.");
            }
        let qurry = 
        `select  
                d_o.do_id,
				d_o.donor_id,
                d_o.organ_id,
                d_o.verified_hospital_id,
                d_o.verified_at,
                d_o.availability_status,
                d_o.verification_status,
                d_o.donor_consent,
                d_o.consent_provided_at,
                d_o.registered_at,
                h.hospital_name,
                d_o.medical_document_path,
                u.name AS donor_name,
                u.user_id,
                m.bloodgroup,
                ot.organ_name
                
                from donor_organ d_o
                
                JOIN donor_profile dp
                ON d_o.donor_id = dp.donor_id
                
                JOIN users u
                ON u.user_id = dp.user_id
                
                JOIN user_medical_info m
                ON m.user_id = u.user_id
                
                JOIN organ_type ot
                ON ot.organ_id = d_o.organ_id
                
                JOIN hospital h
                ON h.hospital_id = d_o.verified_hospital_id
                Where 1=1 `
    
                const values =[]
                if(search){
                    values.push(`%${search}%`)
    
                    qurry += 
                    `AND u.name ILIKE $${values.length}
                     OR CAST( u.user_id AS TEXT) ILIKE $${values.length} `
    
                }
    
                if(status){
                    values.push(status)
    
                    qurry += 
                    `AND d_o.availability_status ILIKE $${values.length} `
    
                }

                if(organ){
                    values.push(organ)
    
                    qurry += 
                    `AND ot.organ_name ILIKE $${values.length} `
    
                }

                console.log(qurry)
    
                const result = await db.query(qurry,values)
    
        return res.render('organ_requests/donor_organ',
            {
                hospital:req.hospital,
                organRequests:result.rows,
                search,
                status,
                organ,
                message:req.query.message || ""
            }
        )
    } catch (error) {
        console.error("Error fetching organ listing requests:", error);

        res.status(500).send(
            "Unable to load organ listing requests."
        );
    }
}

const DonorOrganAction = async (req,res) =>{
    try {
        
        const hospital_id = req.hospital.hospital_id

        const {
            organ_listing_id,
            action,
            password,
            rejection_reason
        } = req.body;

        if (!organ_listing_id || !action || !password) {
            return res.status(400).json({
                success: false,
                message: "Listing ID, action and hospital password are required."
            });
        }

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid action."
            });
        }

        const reason = (rejection_reason || "").trim();

        if (action === "reject" && !reason) {
            return res.status(400).json({
                success: false,
                message: "A rejection reason is mandatory."
            });
        }

        if (reason.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "The rejection reason must not exceed 1000 characters."
            });
        }

        const hospitalResult = await db.query(
            `SELECT * 
             FROM hospital
             WHERE hospital_id = $1`,
            [hospital_id]
        );

        if (hospitalResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Hospital account not found."
            });
        }

        const passwordHash = hospitalResult.rows[0].hospital_password

        const compare = await comparePassword(password,passwordHash)

        if(!compare){
            return res.status(401).json({
                success: false,
                message: "Incorrect hospital password. No changes were made."
            });
        }

        let client;
        client = await db.connect()
        await client.query("BEGIN")

        const listing = await client.query(
            `select verification_status from donor_organ
            where verified_hospital_id = $1
            AND do_id = $2`,
            [hospital_id,organ_listing_id]
        )

        if(listing.rows.length==0 || listing.rows[0].verification_status != "Pending"){

            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Listing not found or already processed."
            });
        }

        if(action == "approve"){
            await client.query(
                `update donor_organ set verification_status = $1
                where verified_hospital_id = $2
                AND do_id = $3`,
                ['Approved',hospital_id,organ_listing_id]
            )
        }
        else{
            await client.query(
                `update donor_organ set verification_status = $1, rejection_reason = $2
                where verified_hospital_id = $3
                AND do_id = $4`,
                ['Rejected',reason,hospital_id,organ_listing_id]
            )
        }

        await client.query("COMMIT");


        return res.json({
            success: true,
            message: `Organ listing ${action}d successfully.`
        });

    } catch (error) {
         if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Organ listing action error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong."
        });

    } finally {
        // Return borrowed connection to the pool
        if (client) client.release();
    }
    
}

const serveOrganReport = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id
        const do_id = req.params.id

        // Fetch the listing – must belong to this hospital
        const result = await db.query(
            `SELECT medical_document_path
             FROM donor_organ
             WHERE do_id = $1
               AND verified_hospital_id = $2`,
            [do_id, hospital_id]
        )

        if (result.rows.length === 0) {
            return res.status(404).send('Report not found or access denied.')
        }

        const docPath = result.rows[0].medical_document_path

        if (!docPath) {
            return res.status(404).send('No medical document has been uploaded for this listing.')
        }

        // Build the absolute path. Paths are stored relative to project root
        // e.g. "uploads/DonorDocs/filename.pdf"
        const absolutePath = path.resolve(__dirname, '../../', docPath)

        if (!fs.existsSync(absolutePath)) {
            console.error('Medical document file missing on disk:', absolutePath)
            return res.status(404).send('Medical document file not found on server.')
        }

        // Serve inline so the browser opens it (works for PDF, images, etc.)
        res.sendFile(absolutePath, {
            headers: { 'Content-Disposition': 'inline' }
        })

    } catch (error) {
        console.error('Error serving medical report:', error)
        return res.status(500).send('Internal Server Error')
    }
}

// ─── Recipient Organ Requests (organ_request table) ────────────────────────

/**
 * GET /hospital/organ-requests/list
 * Show all organ requests assigned to this hospital, sorted by criticality_score DESC
 * Filters: organ, verification_status, search (recipient name or user_id)
 */
const showOrganRequestPage = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id

        const search = (req.query.search || '').trim()
        const organ  = (req.query.organ  || '').trim()
        const status = (req.query.status || '').trim()

        const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Renewal Required']
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).send('Invalid status filter.')
        }

        let query = `
            SELECT
                orq.or_id,
                orq.recipient_id,
                orq.organ_id,
                orq.verified_hospital_id,
                orq.verification_status,
                orq.criticality_score,
                orq.request_count,
                orq.rejection_reason,
                orq.registered_at,
                orq.updated_at,
                ot.organ_name,
                u.name  AS recipient_name,
                u.user_id,
                m.bloodgroup,
                u.dob,
                u.gender,
                -- Age of request in hours for the live countdown
                EXTRACT(EPOCH FROM (NOW() - orq.registered_at)) / 3600 AS hours_since_registered
            FROM organ_request orq
            JOIN recipient_profile rp
                ON orq.recipient_id = rp.recipient_id
            JOIN users u
                ON rp.user_id = u.user_id
            JOIN user_medical_info m
                ON m.user_id = u.user_id
            JOIN organ_type ot
                ON ot.organ_id = orq.organ_id
            WHERE orq.verified_hospital_id = $1
        `

        const values = [hospital_id]

        if (search) {
            values.push(`%${search}%`)
            query += `
                AND (
                    u.name ILIKE $${values.length}
                    OR CAST(u.user_id AS TEXT) ILIKE $${values.length}
                )
            `
        }

        if (organ) {
            values.push(`%${organ}%`)
            query += ` AND ot.organ_name ILIKE $${values.length} `
        }

        if (status) {
            values.push(status)
            query += ` AND orq.verification_status = $${values.length} `
        }

        // Primary sort: criticality_score DESC (most urgent first)
        // Secondary: registered_at ASC (oldest first among same score)
        query += ` ORDER BY orq.criticality_score DESC, orq.registered_at ASC `

        console.log(query)
        const result = await db.query(query, values)

        // Fetch available organ types for the filter dropdown
        const organTypes = await db.query(
            `SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`
        )

        return res.render('organ_requests/organ_request', {
            hospital:     req.hospital,
            requests:     result.rows,
            organTypes:   organTypes.rows,
            search,
            organ,
            status,
            message: req.query.message || ''
        })

    } catch (error) {
        console.error('Error fetching organ requests:', error)
        return res.status(500).send('Unable to load organ requests.')
    }
}

/**
 * POST /hospital/organ-requests/action
 * Hospital approves or rejects a recipient organ request
 */
const OrganRequestAction = async (req, res) => {
    let client
    try {
        const hospital_id = req.hospital.hospital_id

        const { request_id, action, password, rejection_reason } = req.body

        if (!request_id || !action || !password) {
            return res.status(400).json({
                success: false,
                message: 'Request ID, action, and hospital password are required.'
            })
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action.' })
        }

        const reason = (rejection_reason || '').trim()
        if (action === 'reject' && !reason) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required.' })
        }

        // Verify hospital password
        const hospitalResult = await db.query(
            `SELECT hospital_password FROM hospital WHERE hospital_id = $1`,
            [hospital_id]
        )
        if (hospitalResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Hospital not found.' })
        }
        const compare = await comparePassword(password, hospitalResult.rows[0].hospital_password)
        if (!compare) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect hospital password. No changes were made.'
            })
        }

        client = await db.connect()
        await client.query('BEGIN')

        const existing = await client.query(
            `SELECT verification_status FROM organ_request
             WHERE request_id = $1 AND hospital_id = $2`,
            [request_id, hospital_id]
        )

        if (existing.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({
                success: false,
                message: 'Request not found or does not belong to your hospital.'
            })
        }

        if (existing.rows[0].verification_status !== 'Pending') {
            await client.query('ROLLBACK')
            return res.status(409).json({
                success: false,
                message: 'This request is not in Pending status and cannot be actioned.'
            })
        }

        if (action === 'approve') {
            await client.query(
                `UPDATE organ_request
                 SET verification_status = 'Approved', updated_at = NOW()
                 WHERE request_id = $1`,
                [request_id]
            )
        } else {
            await client.query(
                `UPDATE organ_request
                 SET verification_status = 'Rejected',
                     rejection_reason    = $1,
                     updated_at          = NOW()
                 WHERE request_id = $2`,
                [reason, request_id]
            )
        }

        await client.query('COMMIT')

        return res.json({
            success: true,
            message: `Organ request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
        })

    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(() => {})
        console.error('Organ request action error:', error)
        return res.status(500).json({ success: false, message: 'Something went wrong.' })
    } finally {
        if (client) client.release()
    }
}

/**
 * POST /recipient/organ-request/:id/renew   (called by recipient side)
 * Recipient renews a "Renewal Required" request:
 *   - If request_count < 3 => reset to Pending, bump request_count
 *   - If request_count >= 3 => auto-reject permanently
 */
const renewOrganRequest = async (req, res) => {
    let client
    try {
        const user_id    = req.user.user_id
        const request_id = req.params.id

        // Confirm the request belongs to this recipient
        const existingResult = await db.query(
            `SELECT orq.request_id, orq.verification_status, orq.request_count,
                    orq.recipient_id
             FROM organ_request orq
             JOIN recipient_profile rp ON rp.recipient_id = orq.recipient_id
             WHERE orq.request_id = $1 AND rp.user_id = $2`,
            [request_id, user_id]
        )

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found.' })
        }

        const row = existingResult.rows[0]

        if (row.verification_status !== 'Renewal Required') {
            return res.status(409).json({
                success: false,
                message: 'Only requests with status "Renewal Required" can be renewed.'
            })
        }

        client = await db.connect()
        await client.query('BEGIN')

        if (row.request_count >= 3) {
            // 3 cycles exhausted — permanently reject
            await client.query(
                `UPDATE organ_request
                 SET verification_status = 'Rejected',
                     rejection_reason    = 'Automatically rejected: maximum renewal cycles (3) reached without hospital approval.',
                     updated_at          = NOW()
                 WHERE request_id = $1`,
                [request_id]
            )
            await client.query('COMMIT')
            return res.json({
                success: false,
                message: 'Your request has been permanently rejected after 3 renewal cycles. Please file a new request.'
            })
        }

        // Reset to Pending, increment request_count, reset criticality_score, bump registered_at
        await client.query(
            `UPDATE organ_request
             SET verification_status = 'Pending',
                 request_count       = request_count + 1,
                 criticality_score   = 0,
                 registered_at       = NOW(),
                 updated_at          = NOW(),
                 rejection_reason    = NULL
             WHERE request_id = $1`,
            [request_id]
        )

        await client.query('COMMIT')

        return res.json({
            success: true,
            message: `Request renewed successfully. Cycle ${row.request_count + 1} of 3.`
        })

    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(() => {})
        console.error('Renew organ request error:', error)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    } finally {
        if (client) client.release()
    }
}

module.exports = {
    showOrganDashboard,
    showDonorOrganPage,
    DonorOrganAction,
    serveOrganReport,
    showOrganRequestPage,
    OrganRequestAction,
    renewOrganRequest
}