const db = require('../config/db');

/**
 * Dynamically calculate user's age from Date of Birth (dob)
 * @param {Date|string} dob 
 * @returns {number|null} Age in years, or null if invalid
 */
const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const showProfile = async (req, res) => {
    try {
        // CHECK FOR USER PROFILE EXISTANCE
        const user_id = req.user.user_id;

        const result1 = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        );

        if (result1.rows.length === 0) {
            return res.redirect('/logout');
        }

        let user = result1.rows[0];

        // Dynamically calculate age using the dob column details from users table
        const age = calculateAge(user.dob);
        user.age = age;

        console.log("User Profile Loaded, Age:", user.age);
        res.render('profiles', { user: user, age: age });

    } catch (err) {
        console.error("Error in showProfile:", err);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    showProfile,
    calculateAge
};
