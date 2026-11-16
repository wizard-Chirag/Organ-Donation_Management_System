const db = require('../config/db');
const { RecipientToken } = require('../utils/generateToken');
const { comparePassword, hashPassword } = require('../utils/passwords');
const { createNotification } = require('../utils/notificationService');
const { createHospitalNotification, eraseHospitalNotificationByRequest } = require('../utils/hospitalNotificationService');


const showProfileLogin = async (req,res) => {
    
    try {
        const user_id = req.user.user_id;
        const profileCookie = req.cookies.RprofileToken;

        if (profileCookie) {

            const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

            const recipient = await db.query(
                `select * from recipient_profile where user_id = $1`,
                [user_id]
            );

            const hospital = await db.query(
                    `select * from hospital where hospital_id = $1`,
                    [recipient.rows[0].registered_hospital_id]
                );
            return res.render('recipient/recipientDashboard', {
                    user: user.rows[0],
                    recipient: recipient.rows[0],
                    hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
                });
        }

        console.log('Recipient login page loaded');
        return res.render('recipient/recipientLogin', {
        message: null
    });
    }
     catch (error) {
        console.error("Error loading recipient login page:", error);
    }
}

const unLockProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { recipient_id, password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        const recipient = await db.query(
            `select * from recipient_profile where recipient_id = $1 `,
            [recipient_id]
        );

        if (recipient.rows.length === 0) {
            console.log('Invalid credentials / Recipient profile not found');
            if (isJson) {
                return res.json({
                    success: false,
                    message: 'Invalid credentials / Profile not found'
                });
            }
            return res.render('recipient/recipientLogin', {
                message: 'Invalid credentials / Profile not found'
            });
        }

        if (recipient.rows[0].verification_status === 'Rejected' || recipient.rows[0].recipient_status === 'Inactive') {
            console.log('Recipient profile has been rejected - Recipient ID is invalid');
            const rejectedMsg = 'Your recipient profile has been rejected and your recipient ID is now invalid.';
            if (isJson) {
                return res.json({
                    success: false,
                    message: rejectedMsg
                });
            }
            return res.render('recipient/recipientLogin', {
                message: rejectedMsg
            });
        }

        const type = 'Recipient'
        const id = recipient.rows[0].recipient_id;
        const hashedPassword = recipient.rows[0].recipient_password;

        const compare = await comparePassword(password, hashedPassword);
        if (!compare) {
            if (isJson) {
                return res.json({
                    success: false,
                    message: 'Incorrect Password'
                });
            }
            return res.render('recipient/recipientLogin', {
                message: 'Incorrect Password'
            });
        }

        let profileToken = RecipientToken(id,type);
        res.cookie('RprofileToken', profileToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 60 * 1000
        });

        if (isJson) {
            return res.json({
                success: true,
                message: 'Welcome to your Recipient Profile',
                redirectUrl: '/recipient/dashboard'
            });
        }

        return res.redirect('/recipient/dashboard');

    } catch (error) {
        console.error("Error unlocking recipient profile:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.status(500).send('Internal server error');
    }
};

// WHEN A USER ALREADY HOLDING A RECIPIENT PROFILE ASKS FOR CREATING 
// A NEW RECIPIENT PROFILE INSPITE OF EXISTING ONE 
const RecipientCreationOnLogin = async (req,res) => {

    try {
        const user_id = req.user.user_id;
    
            const user = await db.query(
                `select * from users where user_id = $1`,
                [user_id]
            );
    
            const recipient = await db.query(
                `select * from recipient_profile where user_id = $1`,
                [user_id]
            );
         if(recipient.rows.length > 0 && (recipient.rows[0].verification_status === 'Pending' || recipient.rows[0].verification_status === 'Approved'))
            {
                return res.render('recipient/recipientLogin', {
                    message: `Recipient Profile Already exists for user : ${user.rows[0].name}`
                });
            }
    
            // IF Recipient PROFILE DOESNOT EXIST THEN GO FOR CREATION
            return res.redirect('/recipient/create')
    } catch (error) {
        console.error("Error loading recipient on login page:", error);
    }
}

// IF Recipient PROFILE GENUINLY DOESNOT EXIST THEN REDIRECT THE USER BACK TO HERE

const showRecipientCreation = async (req,res)=>{
    try {
        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const medical_record = await db.query(
            `select * from user_medical_info where user_id = $1`,
            [user_id]
        );

        const hospitals = await db.query(
            `select hospital_id, hospital_name from hospital order by hospital_name ASC`
        );

        if(medical_record.rows.length==0){
            console.log('medical report absent bruh')
            return res.redirect('/medical')
        } 
        if (user.rows[0]) {
                user.rows[0].blood_group = medical_record.rows[0].bloodgroup;
            }

        console.log("Create Recipient Page opened");
            return res.render('recipient/createRecipient', {
                user: user.rows[0],
                hospitals: hospitals.rows,
                recipient: true
            });

    }   
     catch (error) {
        console.error("Error loading recipient creation page:", error);
    }
}

const showRecipientDashboard = async (req,res) =>{

    try {

        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const recipient = await db.query(
            `select * from recipient_profile where user_id = $1`,
            [user_id]
        );

        if (recipient.rows.length > 0) {
            const profileCookie = req.cookies.RprofileToken;

            const recipientHospital = await db.query(
                `select hospital_name from hospital where hospital_id = $1`,
                [recipient.rows[0].registered_hospital_id]
            );
            if (profileCookie) {

                console.log("Showing recipient dashboard");
                return res.render('recipient/recipientDashboard', {
                    user: user.rows[0],
                    recipient: recipient.rows[0],
                    hospital: recipientHospital.rows[0] || { hospital_name: 'Not assigned' }
                });
            }

            return res.redirect('/recipient')
        }
    } catch (error) {
        console.error("Error loading recipient dashboard page:", error);
    }
}

const createRecipient = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const {
            hospital_id,
            password,
            profile_password,
        } = req.body;

        const legal_document = req.file;

        if (
            !legal_document ||
            !hospital_id ||
            !password ||
            !profile_password
        ) {
            return res.status(400).send("All fields are mandatory");
        }

        const hospital = await db.query(
            `select * from hospital where hospital_id = $1`,
            [hospital_id]
        );

        if (hospital.rows.length === 0) {
            return res.status(400).send('Select a valid Hospital');
        }

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const hashedPassword = user.rows[0].password;
        const result = await comparePassword(password, hashedPassword);

        if (!result) {
            console.log("Invalid user password")
            return res.status(401).send('Enter valid password');
        }

        const newPassword = await hashPassword(profile_password);
        const normalizedDocPath = legal_document.path.replace(/\\/g, '/');

        // Insert recipient profile request
        await db.query(
            `insert into recipient_profile
            (user_id, recipient_status, registered_hospital_id, attested_document_path, verification_status, recipient_password)
            values($1, $2, $3, $4, $5, $6)`,
            [user_id, 'Active', hospital_id, normalizedDocPath, 'Pending', newPassword]
        );

        // Access the recipient_profile database and fetch the recipient id assigned by the database for that user
        const recipientRecord = await db.query(
            `select recipient_id from recipient_profile where user_id = $1`,
            [user_id]
        );

        const assignedRecipientId = recipientRecord.rows[0]?.recipient_id;
        const hospitalTitle = hospital.rows[0]?.hospital_name || "the hospital";

        // Send notification to the user with the assigned recipient_request ID
        await createNotification({
            user_id: user_id,
            title: "Recipient Profile Sent for Approval",
            message: `Your recipient profile has been sent to ${hospitalTitle} for approval. Here is your recipient_request ID: ${assignedRecipientId}. This can be used for further recipient profile login.`,
            notification_type: "Profile"
        });
        // Send notification to hospital
        await createHospitalNotification({
            hospital_id: hospital_id,
            user_id: user_id,
            title: "New Recipient Profile Request",
            message: `A new recipient profile request has been made by ${user.rows[0]?.name || 'a user'} (Recipient ID: ${assignedRecipientId}).`,
            notification_type: "Profile",
            request_type: "recipient_profile",
            reference_id: assignedRecipientId,
            action_url: "/hospital/profile-requests/recipients"
        });

        console.log(`Recipient profile request created for user ${user_id} with recipient_id ${assignedRecipientId}`);

        return res.redirect('/dashboard');

    } catch (error) {
        console.error("Error in createRecipient:", error);
        res.status(500).send("Internal Server Error");
    }
};

const showUpdateRecipient = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );
        const recipient = await db.query(
            `select * from recipient_profile where user_id = $1`,
            [user_id]
        );

        if (recipient.rows.length === 0) {
            return res.redirect('/recipient');
        }

        if (recipient.rows.length > 0 && recipient.rows[0].verification_status !== 'Approved') {
            const hospital = await db.query(
                `select hospital_name, hospital_id from hospital order by hospital_name ASC`
            );

            return res.render('recipient/updateRecipient', {
                user: user.rows[0],
                hospitals: hospital.rows
            });
        }
        res.send('Recipient profile already approved, cannot be updated');
    } catch (error) {
        console.error("Error in showUpdateRecipient:", error);
        res.status(500).send('Internal server error');
    }
};

const updateRecipientProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const {
            hospital_id,
            password
        } = req.body;

        const legal_document = req.file;

        if (
            !legal_document ||
            !hospital_id ||
            !password
        ) {
            return res.status(400).send("All fields are mandatory");
        }

        const hospital = await db.query(
            `select * from hospital where hospital_id = $1`,
            [hospital_id]
        );

        if (hospital.rows.length === 0) {
            return res.status(400).send('Select a valid Hospital');
        }

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const hashPassword = user.rows[0].password;
        const result = await comparePassword(password, hashPassword);

        if (!result) {
            return res.status(401).send('Enter valid password');
        }

        const normalizedDocPath = legal_document.path.replace(/\\/g, '/');

        await db.query(
            `update recipient_profile set
            registered_hospital_id = $1,
            attested_document_path = $2
            where user_id = $3`,
            [hospital_id, normalizedDocPath, user_id]
        );
        console.log("Recipient profile request Updated");

        return res.redirect('/dashboard');

    } catch (error) {
        console.error("Error updating recipient profile:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Show page to create a new organ request.
 * Filters out organs the user currently has an active (Pending/Approved) request for.
 */
const showCreateOrganRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];

        // Specification 1:
        // "if a user has requested for an organ say kidney then he cannot request for a second kidney untill his request is either rejected/expired due to no action or request withdrawn by the user. in such a case remove the kidney option in the organ request page."
        const activeRequests = await db.query(`
            SELECT organ_id FROM organ_request
            WHERE recipient_id = $1
              AND verification_status IN ('Pending', 'Approved')
              AND request_status != 'Withdrawn'
        `, [recipient.recipient_id]);

        const blockedOrganIds = activeRequests.rows.map(r => r.organ_id);

        let organQuery = `SELECT organ_id, organ_name FROM organ_type`;
        const queryParams = [];
        if (blockedOrganIds.length > 0) {
            organQuery += ` WHERE organ_id != ALL($1)`;
            queryParams.push(blockedOrganIds);
        }
        organQuery += ` ORDER BY organ_name ASC`;

        const availableOrgans = await db.query(organQuery, queryParams);
        const hospitals = await db.query(`SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`);
        const userRes = await db.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);

        return res.render('recipient/requestOrgan', {
            organs: availableOrgans.rows,
            hospitals: hospitals.rows,
            user: userRes.rows[0],
            recipient,
            isRenewal: false,
            message: req.query.msg || null
        });

    } catch (error) {
        console.error("Error in showCreateOrganRequest:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Handle submission of a new organ request.
 */
const createOrganRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;

        const {
            organ_id,
            hospital_id,
            recipient_password
        } = req.body;

        const medical_proof = req.file;

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];
        const recipientId = recipient.recipient_id;

        // Verify password
        const passwordMatch = await comparePassword(recipient_password, recipient.recipient_password);
        if (!passwordMatch) {
            const organs = await db.query(`SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`);
            const hospitals = await db.query(`SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`);
            return res.render('recipient/requestOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                user: req.user,
                recipient,
                isRenewal: false,
                message: "Incorrect recipient profile password."
            });
        }

        if (!medical_proof) {
            return res.redirect('/recipient/organ?msg=Medical+proof+document+is+required');
        }

        // Duplicate check (Specification 1)
        const activeCheck = await db.query(`
            SELECT or_id FROM organ_request
            WHERE recipient_id = $1 AND organ_id = $2
              AND verification_status IN ('Pending', 'Approved')
              AND request_status != 'Withdrawn'
        `, [recipientId, organ_id]);

        if (activeCheck.rows.length > 0) {
            return res.redirect('/recipient/organs?msg=You+already+have+an+active+request+for+this+organ');
        }

        const normalizedPath = medical_proof.path.replace(/\\/g, '/');

        const organ_details = await db.query(
            `select * from organ_type where organ_id = $1`,
            [organ_id]
        )
        const organ_criticality_score = organ_details.rows[0].criticality_score

        // Insert new organ request
        const insertRes = await db.query(`
            INSERT INTO organ_request
            (recipient_id, organ_id, medical_proof_path, verified_hospital_id, verification_status, request_status, registered_at, criticality_score, renewal_priority_bonus, request_count, is_eligible_for_matching, expires_at)
            VALUES ($1, $2, $3, $4, 'Pending', 'Active', NOW(), $5, 0, 0, FALSE, NOW() + INTERVAL '3 days')
            RETURNING or_id
        `, [recipientId, organ_id, normalizedPath, hospital_id,organ_criticality_score]);

        const newRequestId = insertRes.rows[0].or_id;

        const organInfo = await db.query(`SELECT organ_name FROM organ_type WHERE organ_id = $1`, [organ_id]);
        const hospInfo = await db.query(`SELECT hospital_name FROM hospital WHERE hospital_id = $1`, [hospital_id]);
        const organName = organInfo.rows[0]?.organ_name || "Organ";
        const hospitalName = hospInfo.rows[0]?.hospital_name || "the hospital";

        // Notify recipient
        await createNotification({
            user_id: user_id,
            title: "Organ Request Submitted",
            message: `Your organ request for ${organName} (Request ID: ${newRequestId}) has been sent to ${hospitalName} for verification.`,
            notification_type: "Organ Request"
        });

        // Notify hospital
        await createHospitalNotification({
            hospital_id: hospital_id,
            user_id: user_id,
            title: "New Recipient Organ Request",
            message: `A new recipient organ request for ${organName} has been made by ${req.user.name || 'a recipient'} (Request ID: ${newRequestId}).`,
            notification_type: "Organ Request",
            request_type: "organ_request",
            reference_id: newRequestId,
            action_url: "/hospital/organ-requests/list"
        });

        return res.redirect('/recipient/organs?msg=Organ+request+submitted+successfully');

    } catch (error) {
        console.error("Error in createOrganRequest:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Display all organs the recipient has requested previously and presently.
 */
const showRecipientRequests = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];
        const recipientId = recipient.recipient_id;

        const userRes = await db.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);
        const user = userRes.rows[0];

        const medRes = await db.query(`SELECT * FROM user_medical_info WHERE user_id = $1`, [user_id]);
        const medical = medRes.rows[0] || {};

        // Query all organ requests by this recipient
        const requestsRes = await db.query(`
            SELECT
                orq.or_id,
                orq.recipient_id,
                orq.organ_id,
                orq.medical_proof_path,
                orq.verified_hospital_id,
                orq.verified_at,
                orq.request_status,
                orq.verification_status,
                orq.registered_at,
                orq.criticality_score,
                orq.renewal_priority_bonus,
                orq.request_count,
                orq.rejection_reason,
                orq.expires_at,
                orq.updated_at,
                COALESCE(orq.is_eligible_for_matching, false) AS is_eligible_for_matching,
                ot.organ_name,
                ot.criticality_score AS base_criticality_score,
                h.hospital_name,
                h.city AS hospital_city,
                u.name AS recipient_name,
                u.email AS recipient_email,
                u.phone_number AS recipient_phone,
                u.gender AS recipient_gender,
                u.dob AS recipient_dob,
                u.user_id,
                m.bloodgroup
            FROM organ_request orq
            JOIN recipient_profile rp ON orq.recipient_id = rp.recipient_id
            JOIN users u ON rp.user_id = u.user_id
            LEFT JOIN user_medical_info m ON m.user_id = u.user_id
            JOIN organ_type ot ON orq.organ_id = ot.organ_id
            LEFT JOIN hospital h ON orq.verified_hospital_id = h.hospital_id
            WHERE orq.recipient_id = $1
            ORDER BY orq.registered_at DESC
        `, [recipientId]);

        // Calculate dynamic priority score and retest/renewal dates
        // Total priority score = base criticality score + (days pending * 2) + renewal_priority_bonus
        const requests = requestsRes.rows.map(item => {
            const isPending = item.verification_status === 'Pending';
            const daysSinceReg = Math.max(0, Math.floor((Date.now() - new Date(item.registered_at).getTime()) / (1000 * 60 * 60 * 24)));
            const dynamicDailyBonus = isPending ? (daysSinceReg * 2) : 0;
            const totalPriorityScore = (item.base_criticality_score || 0) + dynamicDailyBonus + (item.renewal_priority_bonus || 0);

            // Re-testing / review date (+1 month after verification if approved)
            let retest_date = null;
            if (item.verified_at) {
                const d = new Date(item.verified_at);
                d.setMonth(d.getMonth() + 1);
                retest_date = d;
            }

            return {
                ...item,
                calculated_priority_score: totalPriorityScore,
                retest_date
            };
        });

        const organTypes = await db.query(`SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`);

        return res.render('recipient/recipientRequests', {
            user: { ...user, bloodgroup: medical.bloodgroup || user.blood_group },
            recipient,
            requests,
            organs: organTypes.rows,
            message: req.query.msg || null
        });

    } catch (error) {
        console.error("Error in showRecipientRequests:", error);
        return res.status(500).send("Internal Server Error loading recipient requests.");
    }
};

/**
 * Show page to renew an expired organ request (Verification Status = 'Renewal Required').
 * Specification 2: Blocked while hospital action is pending!
 */
const showRenewOrganRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const requestId = parseInt(req.params.id, 10);

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];

        const requestRes = await db.query(
            `SELECT * FROM organ_request WHERE or_id = $1 AND recipient_id = $2`,
            [requestId, recipient.recipient_id]
        );

        if (requestRes.rows.length === 0) {
            return res.redirect('/recipient/organs?msg=Organ+request+not+found');
        }

        const organRequest = requestRes.rows[0];

        // Specification 2:
        // "the user cannot update or renew his request untill the hospital action is pending unlike the cancellation of request option which he can do anytime (marked as request cancelled/withdrawn). the user must be blocked from updating request details and only be allowed when the hospital no action renewal option is given."
        if (organRequest.verification_status !== 'Renewal Required') {
            return res.redirect('/recipient/organs?msg=Updating+or+renewing+is+only+allowed+when+hospital+action+has+expired+seeking+renewal');
        }

        const organs = await db.query(`SELECT organ_id, organ_name FROM organ_type WHERE organ_id = $1`, [organRequest.organ_id]);
        const hospitals = await db.query(`SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`);
        const userRes = await db.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);

        return res.render('recipient/requestOrgan', {
            organs: organs.rows,
            hospitals: hospitals.rows,
            user: userRes.rows[0],
            recipient,
            organRequest,
            isRenewal: true,
            title: 'Renew Organ Request (+5 Priority Score)',
            message: null
        });

    } catch (error) {
        console.error("Error in showRenewOrganRequest:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Handle renewal submission. Increases priority score by +5 for every such renewal.
 */
const submitRenewOrganRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const requestId = parseInt(req.params.id, 10);

        const {
            hospital_id,
            recipient_password
        } = req.body;

        const medical_proof = req.file;

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];

        const requestRes = await db.query(
            `SELECT * FROM organ_request WHERE or_id = $1 AND recipient_id = $2`,
            [requestId, recipient.recipient_id]
        );

        if (requestRes.rows.length === 0) {
            return res.redirect('/recipient/organs?msg=Organ+request+not+found');
        }

        const organRequest = requestRes.rows[0];

        // Only allow renewal when Renewal Required (Spec 2)
        if (organRequest.verification_status !== 'Renewal Required') {
            return res.redirect('/recipient/organs?msg=Updating+or+renewing+is+only+allowed+when+hospital+action+has+expired+seeking+renewal');
        }

        // Verify password
        const passwordMatch = await comparePassword(recipient_password, recipient.recipient_password);
        if (!passwordMatch) {
            const organs = await db.query(`SELECT organ_id, organ_name FROM organ_type WHERE organ_id = $1`, [organRequest.organ_id]);
            const hospitals = await db.query(`SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`);
            return res.render('recipient/requestOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                user: req.user,
                recipient,
                organRequest,
                isRenewal: true,
                title: 'Renew Organ Request (+5 Priority Score)',
                message: 'Incorrect recipient profile password.'
            });
        }

        let docPath = organRequest.medical_proof_path;
        if (medical_proof) {
            docPath = medical_proof.path.replace(/\\/g, '/');
        }

        const targetHospitalId = hospital_id || organRequest.verified_hospital_id;

        // Specification:
        // "then the user renews the request and sends it for approval (now for every such renewals increase the priority score by 5)."
        const newRenewalBonus = (organRequest.renewal_priority_bonus || 0) + 5;

        const organ_details = await db.query(
            `select * from organ_type where organ_id = $1`,
            [requestRes.rows[0].organ_id]
        )
        const organ_criticality_score = organ_details.rows[0].criticality_score

        await db.query(`
            UPDATE organ_request
            SET verification_status = 'Pending',
                request_status      = 'Active',
                renewal_priority_bonus = $1,
                criticality_score   = $2,
                medical_proof_path  = $3,
                verified_hospital_id = $4,
                registered_at       = NOW(),
                expires_at          = NOW() + INTERVAL '3 days',
                rejection_reason    = NULL,
                request_count       = request_count + 1,
                updated_at          = NOW()
            WHERE or_id = $5 AND recipient_id = $6
        `, [newRenewalBonus, (organ_criticality_score + newRenewalBonus), docPath, targetHospitalId, requestId, recipient.recipient_id]);

        const organInfo = await db.query(`SELECT organ_name FROM organ_type WHERE organ_id = $1`, [organRequest.organ_id]);
        const hospInfo = await db.query(`SELECT hospital_name FROM hospital WHERE hospital_id = $1`, [targetHospitalId]);
        const organName = organInfo.rows[0]?.organ_name || "Organ";
        const hospitalName = hospInfo.rows[0]?.hospital_name || "the hospital";

        // Notify user
        await createNotification({
            user_id: user_id,
            title: "Organ Request Renewed (+5 Priority Boost)",
            message: `Your organ request for ${organName} (Request ID: ${requestId}) has been renewed with a +5 priority boost (Total renewal boost: +${newRenewalBonus} pts) and sent to ${hospitalName} for approval.`,
            notification_type: "Organ Request"
        });

        // Notify hospital
        await createHospitalNotification({
            hospital_id: targetHospitalId,
            user_id: user_id,
            title: "Renewed Recipient Organ Request",
            message: `A renewed recipient organ request for ${organName} (+5 priority boost) has been submitted by ${req.user.name || 'a recipient'} (Request ID: ${requestId}).`,
            notification_type: "Organ Request",
            request_type: "organ_request",
            reference_id: requestId,
            action_url: "/hospital/organ-requests/list"
        });

        return res.redirect('/recipient/organs?msg=Organ+request+renewed+successfully+with+priority+boost');

    } catch (error) {
        console.error("Error in submitRenewOrganRequest:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Cancel/withdraw an organ request.
 * Can be done at any time (Pending, Approved, Renewal Required).
 */
const cancelOrganRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const requestId = parseInt(req.params.id, 10);
        const { recipient_password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        if (!recipient_password) {
            if (isJson) return res.status(400).json({ success: false, message: 'Recipient profile password is required.' });
            return res.redirect('/recipient/organs?msg=Password+required');
        }

        let recipientRes;
        if (profile_id) {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE recipient_id = $1`, [profile_id]);
        } else {
            recipientRes = await db.query(`SELECT * FROM recipient_profile WHERE user_id = $1`, [user_id]);
        }

        if (recipientRes.rows.length === 0) {
            if (isJson) return res.status(404).json({ success: false, message: 'Recipient profile not found.' });
            return res.redirect('/recipient/login');
        }

        const recipient = recipientRes.rows[0];

        // Verify password
        const passwordMatch = await comparePassword(recipient_password, recipient.recipient_password);
        if (!passwordMatch) {
            if (isJson) return res.status(401).json({ success: false, message: 'Incorrect recipient profile password.' });
            return res.redirect('/recipient/organs?msg=Incorrect+password');
        }

        // Fetch request
        const requestRes = await db.query(`
            SELECT orq.*, ot.organ_name, h.hospital_name
            FROM organ_request orq
            JOIN organ_type ot ON orq.organ_id = ot.organ_id
            LEFT JOIN hospital h ON orq.verified_hospital_id = h.hospital_id
            WHERE orq.or_id = $1 AND orq.recipient_id = $2
        `, [requestId, recipient.recipient_id]);

        if (requestRes.rows.length === 0) {
            if (isJson) return res.status(404).json({ success: false, message: 'Organ request not found.' });
            return res.redirect('/recipient/organs?msg=Request+not+found');
        }

        const organRequest = requestRes.rows[0];

        if (organRequest.verification_status === 'Withdrawn' || organRequest.request_status === 'Withdrawn') {
            if (isJson) return res.status(400).json({ success: false, message: 'This request has already been cancelled/withdrawn.' });
            return res.redirect('/recipient/organs?msg=Request+already+withdrawn');
        }

        // Mark as Withdrawn (unavailable & unreachable)
        await db.query(`
            UPDATE organ_request
            SET verification_status = 'Withdrawn',
                request_status      = 'Withdrawn',
                is_eligible_for_matching = FALSE,
                updated_at          = NOW()
            WHERE or_id = $1 AND recipient_id = $2
        `, [requestId, recipient.recipient_id]);

        // Erase notifications for this request from hospital notifications
        await eraseHospitalNotificationByRequest('organ_request', requestId);

        // Send recipient notification
        await createNotification({
            user_id: user_id,
            title: "Organ Request Cancelled",
            message: `Your organ request for ${organRequest.organ_name} (Request ID: ${requestId}) has been cancelled and marked as Withdrawn.`,
            notification_type: "Profile"
        });

        if (isJson) {
            return res.json({
                success: true,
                message: `Organ request for ${organRequest.organ_name} has been cancelled successfully.`
            });
        }

        return res.redirect('/recipient/organs?msg=Organ+request+cancelled+successfully');

    } catch (error) {
        console.error("Error in cancelOrganRequest:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        return res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    showProfileLogin,
    unLockProfile,
    showRecipientCreation,
    showRecipientDashboard,
    createRecipient,
    RecipientCreationOnLogin,
    showUpdateRecipient,
    updateRecipientProfile,
    showCreateOrganRequest,
    createOrganRequest,
    showRecipientRequests,
    showRenewOrganRequest,
    submitRenewOrganRequest,
    cancelOrganRequest
};

// FOR REFERENCE PURPOSES
// const unLockProfile = async (req, res) => {
//     try {
//         const user_id = req.user.user_id;
//         const { recipient_id, password } = req.body;

//         const isJson = req.is('json') || req.headers.accept?.includes('application/json');

//         const user = await db.query(
//             `select * from recipient_profile where user_id = $1`,
//             [user_id]
//         );

//         const recipient = await db.query(
//             `select * from recipient_profile where recipient_id = $1 or user_id = $1`,
//             [recipient_id]
//         );

//         if (recipient.rows.length === 0) {
//             console.log('Invalid credentials / Recipient profile not found');
//             if (isJson) {
//                 return res.json({
//                     success: false,
//                     message: 'Invalid credentials / Profile not found'
//                 });
//             }
//             return res.render('recipient/recipientLogin', {
//                 message: 'Invalid credentials / Profile not found'
//             });
//         }

//         if (recipient.rows[0].verification_status === 'Rejected' || recipient.rows[0].recipient_status === 'Inactive') {
//             console.log('Recipient profile has been rejected - Recipient ID is invalid');
//             const rejectedMsg = 'Your recipient profile has been rejected and your recipient ID is now invalid.';
//             if (isJson) {
//                 return res.json({
//                     success: false,
//                     message: rejectedMsg
//                 });
//             }
//             return res.render('recipient/recipientLogin', {
//                 message: rejectedMsg
//             });
//         }

//         const id = recipient.rows[0].recipient_id;
//         const hashedPassword = recipient.rows[0].recipient_password;

//         const compare = await comparePassword(password, hashedPassword);
//         if (!compare) {
//             if (isJson) {
//                 return res.json({
//                     success: false,
//                     message: 'Incorrect Password'
//                 });
//             }
//             return res.render('recipient/recipientLogin', {
//                 message: 'Incorrect Password'
//             });
//         }

//         let profileToken = ProfileToken(id,'Recipient');
//         res.cookie('profileToken', profileToken, {
//             httpOnly: true,
//             secure: false,
//             sameSite: "lax",
//             maxAge: 5 * 60 * 1000
//         });

//         if (isJson) {
//             return res.json({
//                 success: true,
//                 message: 'Welcome to your Recipient Profile',
//                 redirectUrl: '/recipient'
//             });
//         }

//         return res.redirect('/recipient');

//     } catch (error) {
//         console.error("Error unlocking recipient profile:", error);
//         if (req.is('json') || req.headers.accept?.includes('application/json')) {
//             return res.status(500).json({ success: false, message: 'Internal server error' });
//         }
//         res.status(500).send('Internal server error');
//     }
// };

// const recipientCreationOnLogin = async (req,res) => {

//     const user_id = req.user.user_id;

//         const user = await db.query(
//             `select * from users where user_id = $1`,
//             [user_id]
//         );

//         const recipient = await db.query(
//             `select * from recipient_profile where user_id = $1`,
//             [user_id]
//         );
//      if(recipient.rows.length > 0 && (recipient.rows[0].verification_status === 'Pending' || recipient.rows[0].verification_status === 'Approved'))
//         {
//             return res.render('recipient/recipientLogin', {
//                 message: `Recipient Profile Already exists for user : ${user.rows[0].name}`
//             });
//         }

//         return res.redirect('/recipient')
// }

// const showRecipientProfile = async (req, res) => {
//     try {
//         const user_id = req.user.user_id;
//         const recipient_token = req.cookies.profileToken

//         const user = await db.query(
//             `select * from users where user_id = $1`,
//             [user_id]
//         );

//         const recipient = await db.query(
//             `select * from recipient_profile where user_id = $1`,
//             [user_id]
//         );

//         // IF RECIPIENT PROFILE OF USER PRESENT
//         if (recipient.rows.length > 0) {
//             const profileCookie = req.cookies.profileToken || req.cookies.Profiletoken;

//             if (profileCookie && profileCookie.id === recipient.rows[0].recipient_id) {
//                 const hospital = await db.query(
//                     `select * from hospita   l where hospital_id = $1`,
//                     [recipient.rows[0].registered_hospital_id]
//                 );

//                 console.log("Showing recipient dashboard");
//                 return res.render('recipient/recipientDashboard', {
//                     user: user.rows[0],
//                     recipient: recipient.rows[0],
//                     hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
//                 });
//             }
//             console.log('no token for recipient')

//             return res.redirect('/recipient/login')
//             // console.log("Recipient profile Login page loaded");
//             // return res.render('recipient/recipientLogin', {
//             //     message: null
//             // });
//         }

//         // console.log("Recipient profile Login page loaded");
//         //     return res.render('recipient/recipientLogin', {
//         //         message: null
//         //     });
//         const medical_record = await db.query(
//             `select * from user_medical_info where user_id = $1`,
//             [user_id]
//         );

//         // IF MEDICAL INFO OF USER IS PROVIDED BUT RECIPIENT PROFILE NOT CREATED
//         if (medical_record.rows.length > 0) {
//             const hospital = await db.query(
//                 `select hospital_name, hospital_id from hospital order by hospital_name ASC`
//             );

//             if (user.rows[0]) {
//                 user.rows[0].blood_group = medical_record.rows[0].bloodgroup;
//             }

//             console.log('Recipient Profile creation page Loaded');
//             return res.render('recipient/createRecipient', {
//                 user: user.rows[0],
//                 hospitals: hospital.rows
//             });
//         }

//         // IF MEDICAL INFO OF USER NOT FOUND
//         console.log('User Medical page not present');
//         return res.redirect('/medical');

//     } catch (error) {
//         console.error("Error in showRecipientProfile:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };
