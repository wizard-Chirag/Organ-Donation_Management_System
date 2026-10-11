// READY FOR LAUNCH
const db = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/passwords');
const { ProfileToken } = require('../utils/generateToken');

const showProfileLogin = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const profileCookie = req.cookies.profileToken || req.cookies.Profiletoken;

        if (profileCookie) {
            const donor = await db.query(
                `select * from donor_profile where user_id = $1`,
                [user_id]
            );

            const user = await db.query(
                `select * from users where user_id = $1`,
                [user_id]
            );

            if (donor.rows.length > 0 && user.rows.length > 0) {
                const hospital = await db.query(
                    `select * from hospital where hospital_id = $1`,
                    [donor.rows[0].registered_hospital_id]
                );
                return res.render('donor/donorDashboard', {
                    user: user.rows[0],
                    donor: donor.rows[0],
                    hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
                });
            }
        }

        console.log('Donor login page loaded');
        return res.render('donor/donorLogin', {
            message: null
        });
    } catch (error) {
        console.error("Error loading donor profile login:", error);
        return res.render('donor/donorLogin', {
            message: null
        });
    }
};

const unLockProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { donor_id, password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        const donor = await db.query(
            `select * from donor_profile where donor_id = $1 or user_id = $1`,
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

        const id = donor.rows[0].donor_id;
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

        let profileToken = ProfileToken(id);
        res.cookie('profileToken', profileToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000
        });
        res.cookie('Profiletoken', profileToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000
        });

        if (isJson) {
            return res.json({
                success: true,
                message: 'Welcome to your Donor Profile',
                redirectUrl: '/donor'
            });
        }

        return res.redirect('/donor');

    } catch (error) {
        console.error("Error unlocking donor profile:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.status(500).send('Internal server error');
    }
};

const showDonorProfile = async (req, res) => {
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
            const donorHospital = await db.query(
                `select hospital_name from hospital where hospital_id = $1`,
                [donor.rows[0].registered_hospital_id]
            );

            console.log("Showing donor profile");
            return res.render('donor/donorDashboard', {
                user: user.rows[0],
                donor: donor.rows[0],
                hospital: donorHospital.rows[0] || { hospital_name: 'Not assigned' }
            });
        }

        // checking for existence of MEDICAL PROFILE OF THE USER
        const medical_record = await db.query(
            `select * from user_medical_info where user_id = $1`,
            [user_id]
        );

        const hospitals = await db.query(
            `select hospital_id, hospital_name from hospital order by hospital_name ASC`
        );

        // IF MEDICAL PROFILE PRESENT THEN GO TO CREATE DONOR_PROFILE
        if (medical_record.rows.length > 0) {
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

        // IF NOT PRESENT THEN GO FILL THE MEDICAL PROFILE
        console.log('User Medical page not present');
        return res.redirect('/medical');

    } catch (err) {
        console.error("Error in showDonorProfile:", err);
        res.status(500).send("Internal Server Error");
    }
};

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

        await db.query(
            `insert into donor_profile
            (user_id, donor_status, registered_hospital_id, attested_document_path, verification_status, donor_password)
            values($1, $2, $3, $4, $5, $6)`,
            [user_id, 'Active', hospital_id, normalizedDocPath, 'Pending', newPassword]
        );
        console.log("Donor profile request created");

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
        console.log('Organ listing page loaded');

        const hospitals = await db.query(
            `select hospital_id, hospital_name, city from hospital order by hospital_name ASC`
        );
        const organ = await db.query(
            `select organ_id, organ_name from organ_type order by organ_name ASC`
        );

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

        const normalizedDocPath = medical_report.path.replace(/\\/g, '/');

        await db.query(
            `insert into donor_organ (donor_id, organ_id, testing_hospital_id, test_date, medical_document_path, verification_status)
             values ($1, $2, $3, $4, $5, $6)`,
            [donor.rows[0].donor_id, organ_id, testing_hospital_id, test_date, normalizedDocPath, 'Pending']
        );

        console.log("Organ registered successfully");
        return res.redirect('/donor');

    } catch (error) {
        console.error("Error in registerOrgan:", error);
        return res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    showProfileLogin,
    unLockProfile,
    createDonorProfile,
    showDonorProfile,
    showDonorUpdateProfile,
    updateDonorProfile,
    ShowregisterOrgan,
    registerOrgan
};
