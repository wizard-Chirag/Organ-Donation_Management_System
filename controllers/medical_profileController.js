// READY FOR LAUNCH
const db = require('../config/db');

const showMedicalPortal = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const userResult = await db.query(
            `select * from users where user_id = $1`,
            [user_id]
        );

        const medicalResult = await db.query(
            `select * from user_medical_info where user_id = $1`,
            [user_id]
        );

        console.log("User Medical-profile loaded");
        return res.render("medicalInfo/medicalPortal", {
            user: userResult.rows[0],
            medical: medicalResult.rows[0] || null,
            emergencyError: null
        });

    } catch (err) {
        console.error("Error loading medical portal:", err);
        res.status(500).send("Internal server error");
    }
};

const createMedicalProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const {
            height,
            weight,
            smoker,
            bloodgroup,
            alcoholic,
            medical_summary,
            emergency_contact_name,
            emergency_contact_number,
            emergency_contact_relation
        } = req.body;

        const userResult = await db.query(
            `SELECT name, phone_number, password FROM users WHERE user_id = $1`,
            [user_id]
        );
        const currentUser = userResult.rows[0] || {};

        // ALL FIELDS ENTRY IS MANDATORY
        if (
            !height ||
            !weight ||
            !bloodgroup ||
            smoker === undefined ||
            alcoholic === undefined ||
            !medical_summary ||
            !emergency_contact_name ||
            !emergency_contact_number ||
            !emergency_contact_relation
        ) {
            return res.render('medicalInfo/medicalPortal', {
                user: currentUser,
                medical: req.body,
                emergencyError: "All fields are mandatory"
            });
        }

        const userName = (currentUser.name || '').trim().toLowerCase();
        const userPhone = (currentUser.phone_number || '').trim();
        const emName = (emergency_contact_name || '').trim().toLowerCase();
        const emPhone = (emergency_contact_number || '').trim();

        if (userName === emName || userPhone === emPhone) {
            console.log("User Medical-profile contact is same as user");
            return res.render('medicalInfo/medicalPortal', {
                user: currentUser,
                medical: req.body,
                emergencyError: "Emergency contact cannot be your own contact details."
            });
        }

        // CHECK IF USER HAS MEDICAL PROFILE
        const medical_record = await db.query(
            `select * from user_medical_info where user_id = $1`,
            [user_id]
        );

        if (medical_record.rows.length === 0) {
            // INSERT
            await db.query(
                `insert into user_medical_info (
                    user_id,    
                    height_cm,
                    weight_kg,
                    bloodgroup,
                    smoker,
                    alcoholic,
                    medical_summary,
                    emergency_contact_name,
                    emergency_contact_number,
                    emergency_contact_relation
                ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    user_id,
                    height,
                    weight,
                    bloodgroup,
                    smoker,
                    alcoholic,
                    medical_summary,
                    emergency_contact_name,
                    emergency_contact_number,
                    emergency_contact_relation
                ]
            );

            console.log("User Medical-profile Created");
            return res.redirect("/dashboard");
        }

        // UPDATE (Notice comma after $9!)
        await db.query(
            `update user_medical_info set
                height_cm = $1,
                weight_kg = $2,
                bloodgroup = $9,
                smoker = $3,
                alcoholic = $4,
                medical_summary = $5,
                emergency_contact_name = $6,
                emergency_contact_number = $7,
                emergency_contact_relation = $8,
                updated_at = CURRENT_TIMESTAMP 
            where user_id = $10`,
            [
                height,
                weight,
                smoker,
                alcoholic,
                medical_summary,
                emergency_contact_name,
                emergency_contact_number,
                emergency_contact_relation,
                bloodgroup,
                user_id
            ]
        );

        console.log("User Medical-profile Updated");
        return res.redirect('/dashboard');

    } catch (err) {
        console.error("Error saving medical profile:", err);
        res.status(500).send("Internal server error");
    }
};

module.exports = {
    createMedicalProfile,
    showMedicalPortal
};


