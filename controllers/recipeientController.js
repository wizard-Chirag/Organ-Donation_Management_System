const db = require('../config/db');
const { ProfileToken } = require('../utils/generateToken');
const { comparePassword, hashPassword } = require('../utils/passwords');

const showProfileLogin = (req, res) => {
    console.log('Recipient login page loaded');
    return res.render('recipient/recipientLogin', {
        message: null
    });
};

const unLockProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { recipient_id, password } = req.body;

        const isJson = req.is('json') || req.headers.accept?.includes('application/json');

        const recipient = await db.query(
            `select * from recipient_profile where recipient_id = $1 or user_id = $1`,
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
                message: 'Welcome to your Recipient Profile',
                redirectUrl: '/recipient'
            });
        }

        return res.redirect('/recipient');

    } catch (error) {
        console.error("Error unlocking recipient profile:", error);
        if (req.is('json') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.status(500).send('Internal server error');
    }
};

const showRecipientProfile = async (req, res) => {
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

        // IF RECIPIENT PROFILE OF USER PRESENT
        if (recipient.rows.length > 0) {
            const profileCookie = req.cookies.profileToken || req.cookies.Profiletoken;

            if (profileCookie) {
                const hospital = await db.query(
                    `select * from hospital where hospital_id = $1`,
                    [recipient.rows[0].registered_hospital_id]
                );

                console.log("Showing recipient dashboard");
                return res.render('recipient/recipientDashboard', {
                    user: user.rows[0],
                    recipient: recipient.rows[0],
                    hospital: hospital.rows[0] || { hospital_name: 'Not assigned' }
                });
            }

            console.log("Recipient profile Login page loaded");
            return res.render('recipient/recipientLogin', {
                message: null
            });
        }

        const medical_record = await db.query(
            `select * from user_medical_info where user_id = $1`,
            [user_id]
        );

        // IF MEDICAL INFO OF USER IS PROVIDED BUT RECIPIENT PROFILE NOT CREATED
        if (medical_record.rows.length > 0) {
            const hospital = await db.query(
                `select hospital_name, hospital_id from hospital order by hospital_name ASC`
            );

            if (user.rows[0]) {
                user.rows[0].blood_group = medical_record.rows[0].bloodgroup;
            }

            console.log('Recipient Profile creation page Loaded');
            return res.render('recipient/createRecipient', {
                user: user.rows[0],
                hospitals: hospital.rows
            });
        }

        // IF MEDICAL INFO OF USER NOT FOUND
        console.log('User Medical page not present');
        return res.redirect('/medical');

    } catch (error) {
        console.error("Error in showRecipientProfile:", error);
        res.status(500).send("Internal Server Error");
    }
};

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
            return res.status(401).send('Enter valid password');
        }

        const newPassword = await hashPassword(profile_password);
        const normalizedDocPath = legal_document.path.replace(/\\/g, '/');

        await db.query(
            `insert into recipient_profile
            (user_id, recipient_status, registered_hospital_id, attested_document_path, verification_status, recipient_password)
            values($1, $2, $3, $4, $5, $6)`,
            [user_id, 'Active', hospital_id, normalizedDocPath, 'Pending', newPassword]
        );
        console.log("Recipient profile request created");

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

module.exports = {
    createRecipient,
    showRecipientProfile,
    showUpdateRecipient,
    updateRecipientProfile,
    showProfileLogin,
    unLockProfile
};