const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {

    // Read JWT from cookie
    const token = req.cookies.token;

    // No token found
    if (!token) {
        return res.redirect("/");
    }

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.BHADRA
        );

        // Store user details for later controllers
        req.user = decoded;

        next();

    } catch (err) {
        // Invalid or expired token
        res.clearCookie("token");

        return res.redirect("/");
        console.log(err)

    }

};

module.exports = verifyToken;