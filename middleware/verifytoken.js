const jwt = require("jsonwebtoken");

const verifyUserToken = (req, res, next) => {

    // Read JWT from cookie
    const token = req.cookies.token;

    // No token found
    if (!token) {
        console.log('no token generated/found:user')
        return res.redirect("/");
    }

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.patientBHADRA
        );

        // Store user details for later controllers
        req.user = decoded;

        next();

    } catch (err) {
        // Invalid or expired token
        res.clearCookie("token");

        console.log(err)
        return res.redirect("/");

    }
};

const verifyHospitalToken = (req, res, next) => {

    // Read JWT from cookie
    const token = req.cookies.hospitalToken;

    // No token found
    if (!token) {
        console.log('no token generated/found:hospital')
        return res.redirect("/");
    }

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.hospitalBHADRA
        );

        // Store user details for later controllers
        req.hospital = decoded;

        next();

    } catch (err) {
        // Invalid or expired token
        res.clearCookie("token");

        console.log(err)
        return res.redirect("/");

    }
};

module.exports = {verifyUserToken,verifyHospitalToken};