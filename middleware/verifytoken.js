const jwt = require("jsonwebtoken");

const verifyUserToken = (req, res, next) => {
    // Read JWT from cookie
    const token = req.cookies.token;

    // No token found
    if (!token) {
        console.log('no token generated/found:user');
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
        console.log(err);
        return res.redirect("/");
    }
};

const verifyProfileToken = (req, res, next) => {
    // Read JWT from cookie (supporting both profileToken and Profiletoken)
    const token = req.cookies.profileToken || req.cookies.Profiletoken;

    // No token found
    if (!token) {
        console.log('no token generated/found:profile');
        return res.redirect("/dashboard");
    }

    try {
        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.profileBHADRA
        );

        // Store profile details for later controllers
        req.profile = decoded;
        next();
    } catch (err) {
        // Invalid or expired token
        res.clearCookie("profileToken");
        res.clearCookie("Profiletoken");
        console.log(err);
        return res.redirect("/dashboard");
    }
};

const verifyHospitalToken = (req, res, next) => {
    // Read JWT from cookie
    const token = req.cookies.hospitalToken;

    // No token found
    if (!token) {
        console.log('no token generated/found:hospital');
        return res.redirect("/hospital");
    }

    try {
        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.hospitalBHADRA
        );

        // Store hospital details for later controllers
        req.hospital = decoded;
        next();
    } catch (err) {
        // Invalid or expired token
        res.clearCookie("hospitalToken");
        console.log(err);
        return res.redirect("/hospital");
    }
};

module.exports = {
    verifyUserToken,
    verifyProfileToken,
    verifyHospitalToken
};