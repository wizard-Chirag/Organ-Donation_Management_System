const db = require('../../config/db');
const { comparePassword } = require('../../utils/passwords');
const { hospitalGenToken } = require('../../utils/generateToken');

const showLogin = (req, res) => {
    res.render('hospital/hospitalindex', {
        error: null,
    });
};

const hospitalLogin = async (req, res) => {
    console.log("Hospital login attempt");
    try {
        const { hospital_id, password } = req.body;

        if (!password || !hospital_id) {
            return res.render('hospital/hospitalindex', {
                error: 'Please enter both Hospital ID and Password',
            });
        }

        const hospital = await db.query(
            `select * from hospital where hospital_id = $1`,
            [hospital_id]
        );

        if (hospital.rows.length === 0) {
            return res.render('hospital/hospitalindex', {
                error: "Hospital not found in records",
            });
        }

        let hashpassword = hospital.rows[0].hospital_password;
        const compare = await comparePassword(password, hashpassword);
        if (!compare) {
            return res.render('hospital/hospitalindex', {
                error: "Incorrect password",
            });
        }

        let hospitalToken = hospitalGenToken(hospital.rows[0]);
        res.cookie('hospitalToken', hospitalToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log("Hospital logged in successfully");
        return res.redirect('/hospitalDashboard');
    } catch (error) {
        console.error("Error during hospital login:", error);
        return res.status(500).render('hospital/hospitalindex', {
            error: "Internal server error during login",
        });
    }
};

const logout = (req, res) => {
    res.clearCookie('hospitalToken');
    console.log("Hospital logged out");
    return res.redirect('/hospital');
};

const showDash = async (req, res) => {
    try {
        const hospitalId = req.hospital.hospital_id;

        const hospital = await db.query(
            `select * from hospital where hospital_id = $1`,
            [hospitalId]
        );

        if (hospital.rows.length === 0) {
            res.clearCookie('hospitalToken');
            return res.redirect('/hospital');
        }

        res.render('hospital/hospitalDashboard', {
            hospital: hospital.rows[0]
        });
    } catch (error) {
        console.error("Error loading hospital dashboard:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    logout,
    hospitalLogin,
    showDash,
    showLogin
};