const db = require("../config/db");
const bcrypt = require('../utils/passwords');

const registerHospital = async (req, res) => {
    console.log("Hospital registration attempt");

    try {
        const { id, name, email, contact_number, password, license_number, city, status, transplant_beds } = req.body;

        if (!id || !name || !email || !contact_number 
            || !password || !license_number || !city || !status || !transplant_beds) {
            return res.status(400).send("All fields are mandatory");
        }

        const idCheck = await db.query(
            `select * from hospital where hospital_id = $1`,
            [id]
        );
        if (idCheck.rows.length > 0) {
            return res.status(400).send("Hospital ID already present");
        }

        const contact = await db.query(
            `select * from hospital where contact_number = $1`,
            [contact_number]
        );
        if (contact.rows.length > 0) {
            return res.status(400).send("Phone number already present");
        }

        const emailCheck = await db.query(
            `select * from hospital where hospital_email = $1`,
            [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).send("Email already present");
        }

        const licenceCheck = await db.query(
            `select * from hospital where license_no = $1`,
            [license_number]
        );
        if (licenceCheck.rows.length > 0) {
            return res.status(400).send("License number already present");
        }

        const hashedPassword = await bcrypt.hashPassword(password);

        await db.query(
            `insert into hospital(hospital_id, hospital_name, hospital_email, contact_number, hospital_password, license_no, city, status, transplant_beds)
            values($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                id, name, email, contact_number, hashedPassword, license_number, city, status, transplant_beds
            ]
        );

        console.log('Hospital registered successfully');
        res.redirect('/adminAnthamma');

    } catch (err) {
        console.error("Admin hospital registration error:", err);
        res.status(500).send("Internal Server Error");
    }
};

const showadmin = (req, res) => {
    res.render('adminIndex');
};

module.exports = { registerHospital, showadmin };