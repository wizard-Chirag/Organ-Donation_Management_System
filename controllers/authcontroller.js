const db = require("../config/db");
const bcrypt = require('../utils/passwords');
const { GenerateToken } = require('../utils/generateToken');

const showHome = (req, res) => {
    res.render('index', {
        loginError: null,
        registerError: null
    });
};

const registerUser = async (req, res) => {
    console.log("User registration");

    try {
        const { name, email, phone_number, password, address, city, gender, dob } = req.body;

        if (!name || !email || !phone_number || !password || !address || !city || !gender || !dob) {
            return res.render('index', {
                loginError: null,
                registerError: "All fields are mandatory"
            });
        }

        const phonenumber = await db.query(
            `select * from users where phone_number = $1`,
            [phone_number]
        );
        if (phonenumber.rows.length > 0) {
            return res.render('index', {
                loginError: null,
                registerError: "Phone number already registered"
            });
        }

        const Email = await db.query(
            `select * from users where email = $1`,
            [email]
        );
        if (Email.rows.length > 0) {
            return res.render('index', {
                loginError: null,
                registerError: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hashPassword(password);

        await db.query(
            `insert into users(name, phone_number, password, email, gender, dob, address, city)
            values($1, $2, $3, $4, $5, $6, $7, $8)`,
            [name, phone_number, hashedPassword, email, gender, dob, address, city]
        );

        console.log('User registered successfully');
        res.redirect('/');

    } catch (err) {
        console.error(err);
        res.status(500).render('index', {
            loginError: null,
            registerError: "Internal Server Error during registration"
        });
    }
};

const loginUser = async (req, res) => {
    console.log("User Login request");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('index', {
                loginError: "Email and password are required",
                registerError: null
            });
        }

        const result = await db.query(
            `select * from users where email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.render('index', {
                loginError: "User not found with this email",
                registerError: null
            });
        }

        let user = result.rows[0];

        const compare = await bcrypt.comparePassword(password, user.password);
        if (!compare) {
            return res.render('index', {
                loginError: "Incorrect Password",
                registerError: null
            });
        }

        let token = GenerateToken(user);
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log("User logged in successfully");
        return res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).render('index', {
            loginError: "An error occurred during login. Please try again.",
            registerError: null
        });
    }
};

const logoutUser = (req, res) => {
    res.clearCookie('token');
    res.clearCookie('profileToken');
    res.clearCookie('Rprofiletoken');
    res.clearCookie('Dprofiletoken');
    console.log("User logged out");
    res.redirect('/');
};

const getForgotPassword = async (req,res) => {

    console.log('Forgat password page opened')
    return res.render('forgotPassword',
        {
            message:null
        }
    )
    
}

const ResetProfilePassword = async (req,res) => {
    
    const user_cookie = req.cookies.token

    const {
        email,
        phonenumber,
        old_password,
        new_password
    } = req.body

    if(!user_cookie){
        console.log('Invalid user')
        return res.redirect('/')
    }

    const user = await db.query(
        `select * from users where 
        email = $1`,
        [email]
    )

    if(user.rows.length==0){
       return res.render('forgotPassword',
        {
            message : 'User not found'
        }
       )
    }

    if(user.rows[0].phone_number != phonenumber)
    {
        return res.render('forgotPassword',
        {
            message : 'Invalid User details'
        }
       )
    }

    const hashedpassword = user.rows[0].password
    const compare = await bcrypt.comparePassword(old_password,hashedpassword)

    if(!compare){
        return res.render('forgotPassword',
        {
            message : 'Invalid password'
        }
       )
    }

    const new_hash_password = await bcrypt.hashPassword(new_password)
    await db.query(
        `update donor_profile
        set donor_password = $1`,
        [new_hash_password]
    )
    await db.query(
        `update recipient_profile
        set recipient_password = $1`,
        [new_hash_password]
    )

    console.log('Profile password updated')
    return res.redirect('/dashboard')

}

module.exports = {
    showHome,
    registerUser,
    loginUser,
    logoutUser,
    getForgotPassword,
    ResetProfilePassword
};
