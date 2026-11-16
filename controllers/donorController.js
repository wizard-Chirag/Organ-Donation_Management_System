// READY FOR LAUNCH
const db = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/passwords');
const { DonerToken } = require('../utils/generateToken');
const { createNotification } = require('../utils/notificationService');
const { createHospitalNotification, eraseHospitalNotificationByRequest } = require('../utils/hospitalNotificationService');

const showProfileLogin = async (req, res) => {

    try {
        const user_id = req.user.user_id;
        const profileCookie = req.cookies.DprofileToken;

        if (profileCookie) {

            const user = await db.query(
                `select * from users where user_id = $1`,
                [user_id]
            );

            const donor = await db.query(
                `select * from donor_profile where user_id = $1`,
                [user_id]
            );

            const hospital = await db.query(
                `select * from hospital where hospital_id = $1`,
                [donor.rows[0].registered_hospital_id]
            );
            return res.render('donor/donorDashboard', {
                user: user.rows[0],
                donor: donor.rows[0],
                message:null,
                hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
            });
        }

        return res.render('donor/donorLogin', {
            message: null
        })
    }
    catch (error) {
        console.error("Error loading donor login page:", error);
    }
}

const unLockProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { donor_id, password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        const donor = await db.query(
            `select * from donor_profile where donor_id = $1`,
            [donor_id]
        );

        if (donor.rows.length === 0) {
            console.log('Invalid credentials / Donor profile not found');
            if (isJson) {
                return res.json({
                    success: false,
                    message: 'Invalid credentials / Profile not found'
                });
            }
            return res.render('donor/donorLogin', {
                message: 'Invalid credentials / Profile not found'
            });
        }

        if (donor.rows[0].verification_status === 'Rejected' || donor.rows[0].donor_status === 'Inactive') {
            console.log('Donor profile has been rejected - Donor ID is invalid');
            const rejectedMsg = 'Your donor profile has been rejected and your donor ID is now invalid.';
            if (isJson) {
                return res.json({
                    success: false,
                    message: rejectedMsg
                });
            }
            return res.render('donor/donorLogin', {
                message: rejectedMsg
            });
        }

        const id = donor.rows[0].donor_id;
        const type = 'Donor'
        const hashedPassword = donor.rows[0].donor_password;

        const compare = await comparePassword(password, hashedPassword);
        if (!compare) {
            if (isJson) {
                return res.json({
                    success: false,
                    message: 'Incorrect Password'
                });
            }
            return res.render('donor/donorLogin', {
                message: 'Incorrect Password'
            });
        }

        let profileToken = DonerToken(id, type);
        res.cookie('DprofileToken', profileToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 60 * 1000
        });

        if (isJson) {
            console.log('gnadu3')
            return res.json({
                success: true,
                message: 'Welcome to your Donor Profile',
                redirectUrl: '/donor/dashboard'
            });
        }

        return res.redirect('/donor/dashboard');

    } catch (error) {
        console.error("Error unlocking donor profile:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.status(500).send('Internal server error');
    }
};

// WHEN A USER ALREADY HOLDING A DONOR PROFILE ASKS FOR CREATING 
// A NEW DONOR PROFILE INSPITE OF EXISTING ONE 
const DonorCreationOnLogin = async (req, res) => {

    try {
        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const donor = await db.query(
            `select * from donor_profile where user_id = $1`,
            [user_id]
        );
        if (donor.rows.length > 0 && (donor.rows[0].verification_status === 'Pending' || donor.rows[0].verification_status === 'Approved')) {
            return res.render('donor/donorLogin', {
                message: `Donor Profile Already exists for user : ${user.rows[0].name}`
            });
        }

        // IF DONOR PROFILE DOESNOT EXIST THEN GO FOR CREATION
        return res.redirect('/donor/create')
    } catch (error) {
        console.error("Error loading donor on login page:", error);
    }
}

// IF DONOR PROFILE GENUINLY DOESNOT EXIST THEN REDIRECT THE USER BACK TO HERE

const showDonorCreation = async (req, res) => {
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

        if (medical_record.rows.length == 0) {
            console.log('medical profile absent bruh')
            return res.redirect('/medical')
        }   

        if (user.rows[0]) {
            user.rows[0].blood_group = medical_record.rows[0].bloodgroup;
        }

        console.log("Create Donor Page opened");
        return res.render('donor/createDonor', {
            user: user.rows[0],
            hospitals: hospitals.rows,
            donor: true
        });
    }
    catch (error) {
        console.error("Error loading donor creation page:", error);
    }
}

const showDonorDashboard = async (req, res) => {

    try {

        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const donor = await db.query(
            `select * from donor_profile where user_id = $1`,
            [user_id]
        );

        if (donor.rows.length > 0) {
            const profileCookie = req.cookies.DprofileToken;

            const donorHospital = await db.query(
                `select hospital_name from hospital where hospital_id = $1`,
                [donor.rows[0].registered_hospital_id]
            );
            if (profileCookie) {

                console.log("Showing donor dashboard");
                return res.render('donor/donorDashboard', {
                    user: user.rows[0],
                    donor: donor.rows[0],
                    message:null,
                    hospital: donorHospital.rows[0] || { hospital_name: 'Not assigned' }
                });
            }

            return res.redirect('/donor')
        }
    } catch (error) {
        console.error("Error loading donor dashboard page:", error);
    }
}

const createDonorProfile = async (req, res) => {
    const user_id = req.user.user_id;
    try {
        const {
            hospital_id,
            password,
            profile_password
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

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );
        const hospitalName = await db.query(
            `select hospital_name from hospital where hospital_id = $1`,
            [hospital_id]
        );

        if (hospitalName.rows.length === 0) {
            console.log("Invalid hospital");
            return res.status(400).send("Incorrect hospital details");
        }

        const hashedpassword = user.rows[0].password;
        const compare = await comparePassword(password, hashedpassword);

        if (!compare) {
            console.log("Invalid password for donor_profile creation");
            return res.status(401).send("Incorrect Password");
        }

        const newPassword = await hashPassword(profile_password);
        const normalizedDocPath = legal_document.path.replace(/\\/g, '/');

        // Insert donor profile request
        await db.query(
            `insert into donor_profile
            (user_id, donor_status, registered_hospital_id, attested_document_path, verification_status, donor_password)
            values($1, $2, $3, $4, $5, $6)`,
            [user_id, 'Active', hospital_id, normalizedDocPath, 'Pending', newPassword]
        );

        // Access the donor_profile database and fetch the donor id assigned by the database for that user
        const donorRecord = await db.query(
            `select donor_id from donor_profile where user_id = $1`,
            [user_id]
        );

        const assignedDonorId = donorRecord.rows[0]?.donor_id;
        const hospitalTitle = hospitalName.rows[0]?.hospital_name || "the hospital";

        // Send notification to the user with the assigned donor_request ID
        await createNotification({
            user_id: user_id,
            title: "Donor Profile Sent for Approval",
            message: `Your donor profile has been sent to ${hospitalTitle} for approval. Here is your donor_request ID: ${assignedDonorId}. This can be used for further donor profile login.`,
            notification_type: "Profile"
        });
        // Send notification to hospital
        await createHospitalNotification({
            hospital_id: hospital_id,
            user_id: user_id,
            title: "New Donor Profile Request",
            message: `A new donor profile request has been made by ${user.rows[0]?.name || 'a user'} (Donor ID: ${assignedDonorId}).`,
            notification_type: "Profile",
            request_type: "donor_profile",
            reference_id: assignedDonorId,
            action_url: "/hospital/profile-requests/donor"
        });

        console.log(`Donor profile request created for user ${user_id} with donor_id ${assignedDonorId}`);

        return res.redirect('/dashboard');

    } catch (err) {
        console.error("Error in createDonorProfile:", err);
        res.status(500).send("Internal Server Error");
    }
};

const showDonorUpdateProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const donor = await db.query(
            `select * from donor_profile where user_id = $1`,
            [user_id]
        );

        if (donor.rows.length > 0 && donor.rows[0].verification_status !== 'Approved') {
            const hospitals = await db.query(
                `select hospital_id, hospital_name from hospital order by hospital_name ASC`
            );
            return res.render('donor/updateDonor', {
                user: user.rows[0],
                hospitals: hospitals.rows
            });
        }
        res.send('Donor profile already approved, cannot be updated');

    } catch (error) {
        console.error("Error in showDonorUpdateProfile:", error);
        return res.status(500).send('Internal server error');
    }
};

const updateDonorProfile = async (req, res) => {
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

        const hospitalName = await db.query(
            `select hospital_name from hospital where hospital_id = $1`,
            [hospital_id]
        );

        if (hospitalName.rows.length === 0) {
            console.log("Invalid hospital");
            return res.status(400).send("Incorrect hospital details");
        }

        const user = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const hashedpassword = user.rows[0].password;
        const compare = await comparePassword(password, hashedpassword);

        if (!compare) {
            console.log("Invalid password for donor_profile update");
            return res.status(401).send("Incorrect Password");
        }

        const normalizedDocPath = legal_document.path.replace(/\\/g, '/');

        await db.query(
            `update donor_profile set
            registered_hospital_id = $1,
            attested_document_path = $2
            where user_id = $3`,
            [hospital_id, normalizedDocPath, user_id]
        );
        console.log("Donor profile request updated");
        return res.redirect('/dashboard');

    } catch (error) {
        console.error("Error updating donor profile:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const ShowregisterOrgan = async (req, res) => {
    try {
        const donor_id = req.profile ? req.profile.profile_id : null;
        const user_id = req.user.user_id;
        console.log('Organ listing page loaded');

        const hospitals = await db.query(
            `select hospital_id, hospital_name, city from hospital order by hospital_name ASC`
        );
        const organ = await db.query(
            `select organ_id, organ_name from organ_type order by organ_name ASC`
        );
        const donor = await db.query(`select * from donor_profile where donor_id = $1`, [donor_id]);

        const hospital = await db.query(
            `select h.hospital_name , h.city
            from hospital h
            join donor_profile dp on
            dp.registered_hospital_id = h.hospital_id`
        );
        const user = await db.query(
            `select * from users where user_id = $1`,[user_id]
        )

        if(donor.rows[0].verification_status != 'Approved'){
            return res.render('donor/donorDashboard',{
                donor:donor.rows[0],
                user:user.rows[0],
                hospital:hospital.rows[0],
                message:'Profile not Approved'
            })
        }

        return res.render('donor/listOrgan', {
            organs: organ.rows,
            hospitals: hospitals.rows,
            message: null
        });
    } catch (error) {
        console.error("Error in ShowregisterOrgan:", error);
        res.status(500).send("Internal Server Error");
    }
};

const registerOrgan = async (req, res) => {
    try {
        const donor_id = req.profile ? req.profile.profile_id : null;
        const user_id = req.user.user_id;

        const {
            organ_id,
            testing_hospital_id,
            test_date,
            donor_password,
            donor_consent
        } = req.body;

        const medical_report = req.file;

        const hospitals = await db.query(
            `select hospital_id, hospital_name, city from hospital order by hospital_name ASC`
        );
        
        const organs = await db.query(
            `select organ_id, organ_name from organ_type order by organ_name ASC`
        );

        if (
            !organ_id ||
            !testing_hospital_id ||
            !test_date ||
            !donor_password ||
            !donor_consent ||
            !medical_report
        ) {
            return res.render('donor/listOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                message: 'All fields are mandatory'
            });
        }

        let donor;
        if (donor_id) {
            donor = await db.query(`select * from donor_profile where donor_id = $1`, [donor_id]);
        } else {
            donor = await db.query(`select * from donor_profile where user_id = $1`, [user_id]);
        }

        if (donor.rows.length === 0) {
            return res.render('donor/listOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                message: 'Donor profile not found'
            });
        }

        const compare = await comparePassword(donor_password, donor.rows[0].donor_password);
        if (!compare) {
            return res.render('donor/listOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                message: 'Incorrect donor profile password'
            });
        }

        // Rule 1: Block registering the same organ until hospital approves or rejects it
        // Or if approved and currently Available
        const existingListing = await db.query(
            `SELECT do_id, verification_status, availability_status 
             FROM donor_organ 
             WHERE donor_id = $1 AND organ_id = $2
             ORDER BY do_id DESC`,
            [donor.rows[0].donor_id, organ_id]
        );

        if (existingListing.rows.length > 0) {
            const pending = existingListing.rows.find(r => r.verification_status === 'Pending');
            if (pending) {
                return res.render('donor/listOrgan', {
                    organs: organs.rows,
                    hospitals: hospitals.rows,
                    message: 'You already have a pending registration for this organ awaiting hospital verification. You cannot register the same organ until it is processed.'
                });
            }

            const active = existingListing.rows.find(r => r.verification_status === 'Approved' && r.availability_status === 'Available');
            if (active) {
                return res.render('donor/listOrgan', {
                    organs: organs.rows,
                    hospitals: hospitals.rows,
                    message: 'You already have an approved and active listing for this organ. You cannot list the same organ until it is used or withdrawn.'
                });
            }
        }

        const normalizedDocPath = medical_report.path.replace(/\\/g, '/');


        // Insert donor organ listing
        const insertRes = await db.query(
            `INSERT INTO donor_organ (
                donor_id, organ_id, verified_hospital_id, verified_at, 
                medical_document_path, verification_status, donor_consent, 
                availability_status, is_eligible_for_matching, registered_at
             )
             VALUES ($1, $2, $3, $4, $5, 'Pending', 'Provided', 'Available', false, NOW())
             RETURNING do_id`,
            [donor.rows[0].donor_id, organ_id, testing_hospital_id, test_date, normalizedDocPath]
        );

        const newListingId = insertRes.rows[0].do_id;

        const organInfo = await db.query(`SELECT organ_name FROM organ_type WHERE organ_id = $1`, [organ_id]);
        const hospInfo = await db.query(`SELECT hospital_name FROM hospital WHERE hospital_id = $1`, [testing_hospital_id]);
        const userInfo = await db.query(`SELECT name FROM users WHERE user_id = $1`, [user_id]);

        const organName = organInfo.rows[0]?.organ_name || "Organ";
        const hospitalName = hospInfo.rows[0]?.hospital_name || "the hospital";
        const userName = userInfo.rows[0]?.name || "Donor";

        // Notify donor
        await createNotification({
            user_id: user_id,
            title: "Organ Listing Submitted",
            message: `Your registration for organ ${organName} (Listing ID: ${newListingId}) with donor_id ${donor.rows[0].donor_id} has been submitted to ${hospitalName} for verification.`,
            notification_type: "Profile"
        });

        // Notify hospital
        await createHospitalNotification({
            hospital_id: testing_hospital_id,
            user_id: user_id,
            title: "New Donor Organ Listing",
            message: `A new donor organ listing for organ ${organName} has been made with donor_id ${donor.rows[0].donor_id} (user_id: ${user_id}, Listing ID: ${newListingId}).`,
            notification_type: "Organ Request",
            request_type: "donor_organ",
            reference_id: newListingId,
            action_url: "/hospital/donor_organ-listings"
        });

        console.log("Organ registered successfully with ID:", newListingId);
        return res.redirect('/donor/organs?msg=Organ+registered+successfully');

    } catch (error) {
        console.error("Error in registerOrgan:", error);
        return res.status(500).send('Internal Server Error');
    }
};

/**
 * Display all organs the donor has listed previously and presently.
 */
const showDonorOrgans = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;

        let donorRes;
        if (profile_id) {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE donor_id = $1`, [profile_id]);
        } else {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE user_id = $1`, [user_id]);
        }

        if (donorRes.rows.length === 0) {
            return res.redirect('/donor/login');
        }

        const donor = donorRes.rows[0];

        const userRes = await db.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);
        const user = userRes.rows[0];

        const medicalRes = await db.query(`SELECT * FROM user_medical_info WHERE user_id = $1`, [user_id]);
        const medical = medicalRes.rows[0] || {};


        const hospital = await db.query(
            `select h.hospital_name , h.city
            from hospital h
            join donor_profile dp on
            dp.registered_hospital_id = h.hospital_id`
        );

        if(donor.verification_status != 'Approved'){
            return res.render('donor/donorDashboard',{
                donor:donor,
                user:user,
                hospital:hospital.rows[0],
                message:'Profile not Approved || No organ Registered'
            })
        }

        // Query all organ listings by this donor
        const listingsRes = await db.query(`
            SELECT 
                d_o.do_id,
                d_o.donor_id,
                d_o.organ_id,
                d_o.medical_document_path,
                d_o.verification_status,
                d_o.verified_hospital_id,
                d_o.verified_at,
                d_o.availability_status,
                d_o.registered_at,
                d_o.rejection_reason,
                COALESCE(d_o.is_eligible_for_matching, false) AS is_eligible_for_matching,
                ot.organ_name,
                h.hospital_name,
                h.city AS hospital_city,
                u.name AS donor_name,
                u.email AS donor_email,
                u.phone_number AS donor_phone,
                u.gender AS donor_gender,
                u.dob AS donor_dob,
                u.user_id,
                m.bloodgroup
            FROM donor_organ d_o
            JOIN donor_profile dp ON d_o.donor_id = dp.donor_id
            JOIN users u ON dp.user_id = u.user_id
            LEFT JOIN user_medical_info m ON m.user_id = u.user_id
            JOIN organ_type ot ON d_o.organ_id = ot.organ_id
            JOIN hospital h ON d_o.verified_hospital_id = h.hospital_id
            WHERE d_o.donor_id = $1
            ORDER BY d_o.registered_at DESC, d_o.do_id DESC
        `, [donor.donor_id]);

        // Process listings to compute re-testing date (1 month after verified_at)
        const listings = listingsRes.rows.map(item => {
            let retestDate = null;
            if (item.verified_at) {
                const prevDate = new Date(item.verified_at);
                const nextDate = new Date(prevDate);
                nextDate.setMonth(nextDate.getMonth() + 1);
                retestDate = nextDate;
            }
            return {
                ...item,
                retest_date: retestDate
            };
        });

        // Organs list for filter dropdown
        const organTypes = await db.query(`SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`);

        return res.render('donor/donorOrgans', {
            user: { ...user, bloodgroup: medical.bloodgroup || user.blood_group },
            donor,
            listings,
            organs: organTypes.rows,
            message: req.query.msg || null
        });

    } catch (error) {
        console.error("Error in showDonorOrgans:", error);
        return res.status(500).send("Internal Server Error loading donor organs.");
    }
};

/**
 * Show page to update organ listing (enabled only before hospital approval).
 */
const showUpdateOrganListing = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const listingId = parseInt(req.params.id, 10);

        let donorRes;
        if (profile_id) {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE donor_id = $1`, [profile_id]);
        } else {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE user_id = $1`, [user_id]);
        }

        if (donorRes.rows.length === 0) {
            return res.redirect('/donor/login');
        }

        const listingRes = await db.query(
            `SELECT * FROM donor_organ WHERE do_id = $1 AND donor_id = $2`,
            [listingId, donorRes.rows[0].donor_id]
        );

        if (listingRes.rows.length === 0) {
            return res.redirect('/donor/organs?msg=Organ+listing+not+found');
        }

        const listing = listingRes.rows[0];

        // Only allow update BEFORE approval and only if NOT withdrawn
        if (listing.verification_status !== 'Pending' || listing.availability_status === 'Withdrawn' || listing.donor_consent === 'Withdrawn') {
            return res.redirect('/donor/organs?msg=Withdrawn+or+finalized+organ+listings+cannot+be+updated');
        }

        const hospitals = await db.query(
            `SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`
        );
        const organs = await db.query(
            `SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`
        );

        return res.render('donor/listOrgan', {
            organs: organs.rows,
            hospitals: hospitals.rows,
            listing,
            isUpdate: true,
            title: 'Update Organ Listing',
            message: null
        });

    } catch (error) {
        console.error("Error in showUpdateOrganListing:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Handle updating an organ listing before approval.
 */
const updateOrganListing = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const listingId = parseInt(req.params.id, 10);

        const {
            organ_id,
            testing_hospital_id,
            test_date,
            donor_password,
            donor_consent
        } = req.body;

        const medical_report = req.file;

        let donorRes;
        if (profile_id) {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE donor_id = $1`, [profile_id]);
        } else {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE user_id = $1`, [user_id]);
        }

        if (donorRes.rows.length === 0) {
            return res.redirect('/donor/login');
        }

        const donor = donorRes.rows[0];

        const listingRes = await db.query(
            `SELECT * FROM donor_organ WHERE do_id = $1 AND donor_id = $2`,
            [listingId, donor.donor_id]
        );

        if (listingRes.rows.length === 0) {
            return res.redirect('/donor/organs?msg=Organ+listing+not+found');
        }

        const listing = listingRes.rows[0];

        // Block update if not Pending or if Withdrawn
        if (listing.verification_status !== 'Pending' || listing.availability_status === 'Withdrawn' || listing.donor_consent === 'Withdrawn') {
            return res.redirect('/donor/organs?msg=Withdrawn+or+processed+organ+listings+cannot+be+updated');
        }

        // Verify password
        const compare = await comparePassword(donor_password, donor.donor_password);
        if (!compare) {
            const hospitals = await db.query(`SELECT hospital_id, hospital_name, city FROM hospital ORDER BY hospital_name ASC`);
            const organs = await db.query(`SELECT organ_id, organ_name FROM organ_type ORDER BY organ_name ASC`);
            return res.render('donor/listOrgan', {
                organs: organs.rows,
                hospitals: hospitals.rows,
                listing: { ...listing, organ_id, verified_hospital_id: testing_hospital_id, verified_at: test_date },
                isUpdate: true,
                title: 'Update Organ Listing',
                message: 'Incorrect donor profile password.'
            });
        }

        let docPath = listing.medical_document_path;
        if (medical_report) {
            docPath = medical_report.path.replace(/\\/g, '/');
        }

        // Update donor_organ
        await db.query(`
            UPDATE donor_organ 
            SET organ_id = $1,
                verified_hospital_id = $2,
                verified_at = $3,
                medical_document_path = $4,
                rejection_reason = NULL
            WHERE do_id = $5 AND donor_id = $6
        `, [organ_id, testing_hospital_id, test_date, docPath, listingId, donor.donor_id]);

        const organInfo = await db.query(`SELECT organ_name FROM organ_type WHERE organ_id = $1`, [organ_id]);
        const hospInfo = await db.query(`SELECT hospital_name FROM hospital WHERE hospital_id = $1`, [testing_hospital_id]);
        const userInfo = await db.query(`SELECT name FROM users WHERE user_id = $1`, [user_id]);

        const organName = organInfo.rows[0]?.organ_name || "Organ";
        const hospitalName = hospInfo.rows[0]?.hospital_name || "the hospital";
        const userName = userInfo.rows[0]?.name || "Donor";

        // Notify donor
        await createNotification({
            user_id: user_id,
            title: "Organ Listing Updated",
            message: `Your organ listing for ${organName} (Listing ID: ${listingId}) has been updated and is awaiting verification by ${hospitalName}.`,
            notification_type: "Profile"
        });

        // Notify hospital
        await createHospitalNotification({
            hospital_id: testing_hospital_id,
            user_id: user_id,
            title: "Donor Organ Listing Updated",
            message: `The donor organ listing for ${organName} (Listing ID: ${listingId}) has been updated by ${userName}.`,
            notification_type: "Organ Request",
            request_type: "donor_organ",
            reference_id: listingId,
            action_url: "/hospital/donor_organ-listings"
        });

        return res.redirect('/donor/organs?msg=Organ+listing+updated+successfully');

    } catch (error) {
        console.error("Error in updateOrganListing:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Cancel / withdraw an organ listing.
 */
const cancelOrganListing = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profile_id = req.profile ? req.profile.profile_id : null;
        const listingId = parseInt(req.params.id, 10);
        const { donor_password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        if (!donor_password) {
            if (isJson) return res.status(400).json({ success: false, message: 'Donor password is required to cancel listing.' });
            return res.redirect('/donor/organs?msg=Donor+password+required');
        }

        let donorRes;
        if (profile_id) {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE donor_id = $1`, [profile_id]);
        } else {
            donorRes = await db.query(`SELECT * FROM donor_profile WHERE user_id = $1`, [user_id]);
        }

        if (donorRes.rows.length === 0) {
            if (isJson) return res.status(404).json({ success: false, message: 'Donor profile not found.' });
            return res.redirect('/donor/login');
        }

        const donor = donorRes.rows[0];

        // Verify donor password
        const compare = await comparePassword(donor_password, donor.donor_password);
        if (!compare) {
            if (isJson) return res.status(401).json({ success: false, message: 'Incorrect donor profile password.' });
            return res.redirect('/donor/organs?msg=Incorrect+password');
        }

        // Fetch listing
        const listingRes = await db.query(`
            SELECT d_o.*, ot.organ_name, h.hospital_name 
            FROM donor_organ d_o
            JOIN organ_type ot ON d_o.organ_id = ot.organ_id
            JOIN hospital h ON d_o.verified_hospital_id = h.hospital_id
            WHERE d_o.do_id = $1 AND d_o.donor_id = $2
        `, [listingId, donor.donor_id]);

        if (listingRes.rows.length === 0) {
            if (isJson) return res.status(404).json({ success: false, message: 'Listing not found.' });
            return res.redirect('/donor/organs?msg=Listing+not+found');
        }

        const listing = listingRes.rows[0];

        if (listing.verification_status === 'Withdrawn' || listing.availability_status === 'Withdrawn') {
            if (isJson) return res.status(400).json({ success: false, message: 'This organ listing has already been withdrawn.' });
            return res.redirect('/donor/organs?msg=Listing+already+withdrawn');
        }

        // Mark as Withdrawn in donor_organ (both verification_status and availability_status)
        await db.query(`
            UPDATE donor_organ
            SET verification_status = 'Withdrawn',
                availability_status = 'Withdrawn',
                donor_consent = 'Withdrawn',
                is_eligible_for_matching = FALSE
            WHERE do_id = $1 AND donor_id = $2
        `, [listingId, donor.donor_id]);

        // Erase notifications for this organ listing from hospital notifications
        await eraseHospitalNotificationByRequest('donor_organ', listingId);

        // Send donor notification
        await createNotification({
            user_id: user_id,
            title: "Organ Listing Cancelled",
            message: `Your organ listing for ${listing.organ_name} (Listing ID: ${listingId}) has been cancelled and marked as Withdrawn.`,
            notification_type: "Profile"
        });

        if (isJson) {
            return res.json({
                success: true,
                message: `Organ listing for ${listing.organ_name} has been cancelled successfully.`
            });
        }

        return res.redirect('/donor/organs?msg=Organ+listing+cancelled+successfully');

    } catch (error) {
        console.error("Error in cancelOrganListing:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        return res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    showProfileLogin,
    unLockProfile,
    DonorCreationOnLogin,
    showDonorCreation,
    showDonorDashboard,
    createDonorProfile,
    showDonorUpdateProfile,
    updateDonorProfile,
    ShowregisterOrgan,
    registerOrgan,
    showDonorOrgans,
    showUpdateOrganListing,
    updateOrganListing,
    cancelOrganListing
};

// FOR REFERENCE PURPOSES
// const showDonorCreation = async (req, res) => {
//     try {
//         const user_id = req.user.user_id;

//         const user = await db.query(
//             `select * from users where user_id = $1`,
//             [user_id]
//         );

//         const donor = await db.query(
//             `select * from donor_profile where user_id = $1`,
//             [user_id]
//         );

//         if (donor.rows.length > 0) {
//             const profileCookie = req.cookies.profileToken || req.cookies.Profiletoken;

//             const donorHospital = await db.query(
//                 `select hospital_name from hospital where hospital_id = $1`,
//                 [donor.rows[0].registered_hospital_id]
//             );
//             if (profileCookie && profileCookie.id === donor.rows[0].donor_id) {

//                 console.log("Showing donor dashboard");
//                 return res.render('donor/donorDashboard', {
//                     user: user.rows[0],
//                     donor: donor.rows[0],
//                     hospital: donorHospital.rows[0] || { hospital_name: 'Not assigned' }
//                 });
//             }

//             return res.redirect('/donor/login')
//         }

//         // checking for existence of MEDICAL PROFILE OF THE USER
//         const medical_record = await db.query(
//             `select * from user_medical_info where user_id = $1`,
//             [user_id]
//         );
//         // const hospitals = await db.query(
//         //     `select hospital_id, hospital_name from hospital order by hospital_name ASC`
//         // );

//         // IF MEDICAL PROFILE PRESENT THEN GO TO CREATE DONOR_PROFILE

//         if (medical_record.rows.length > 0) {
//             if (user.rows[0]) {
//                 user.rows[0].blood_group = medical_record.rows[0].bloodgroup;
//             }
//             console.log("Donor profile Login page loaded");
//             return res.render('donor/donorLogin', {
//                 message: null
//             });
//             // console.log("Create Donor Page opened");
//             // return res.render('donor/createDonor', {
//             //     user: user.rows[0],
//             //     hospitals: hospitals.rows,
//             //     donor: true
//             // });
//         }

//         // IF NOT PRESENT THEN GO FILL THE MEDICAL PROFILE
//         console.log('User Medical page not present');
//         return res.redirect('/medical');

//     } catch (err) {
//         console.error("Error in showDonorProfile:", err);
//         res.status(500).send("Internal Server Error");
//     }
// };

// const showProfileLogin = async (req, res) => {
//     try {
//         const user_id = req.user.user_id;
//         const profileCookie = req.cookies.profileToken || req.cookies.Profiletoken;

//         if (profileCookie) {
//             const donor = await db.query(
//                 `select * from donor_profile where user_id = $1`,
//                 [user_id]
//             );

//             const user = await db.query(
//                 `select * from users where user_id = $1`,
//                 [user_id]
//             );

//            const medical_record = await db.query(
//             `select * from user_medical_info where user_id = $1`,
//             [user_id]
//             );

//             const hospital = await db.query(
//                     `select * from hospital where hospital_id = $1`,
//                     [donor.rows[0].registered_hospital_id]
//                 );

//             // MEDICAL REPORT PRESENT BUT PROFILE NOT PRESENT
//             if(donor.rows.length == 0 && medical_record.rows.length>0)
//             {
//             console.log('Donor login page loaded');
//             return res.render('donor/donorLogin', {
//             message: null
//             });
//             }

//             // BOTH PROFILE AND MEDICAL REPORT PRESENT
//             if (donor.rows.length > 0 && user.rows.length > 0) {
//                 return res.render('donor/donorDashboard', {
//                     user: user.rows[0],
//                     donor: donor.rows[0],
//                     hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
//                 });
//             }
//         }

//         console.log('Donor login page loaded');
//         return res.render('donor/donorLogin', {
//             message: null
//         });
//     } catch (error) {
//         console.error("Error loading donor profile login:", error);
//         return res.render('donor/donorLogin', {
//             message: null
//         });
//     }
// };
