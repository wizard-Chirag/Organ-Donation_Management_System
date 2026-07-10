const db = require("../config/db");
// const bcrypt = require("bcrypt");
const bcrypt = require('../utils/passwords')
const tokener = require('../utils/generateToken')

const showHome = (req,res)=>{
    res.render('index',{loginError: null,
    registerError: null})
}

const registerUser= async (req,res)=>{
    // console.log(req.body)
    console.log("User registration")
    // res.send("User registration")

    try {
        const {name,email,phone_number,password,address,city,gender,dob,blood_group} = req.body

        if(!name || !email || !phone_number 
            || !password || !address || !city || !gender || !dob || !blood_group)
            {
                return res.send("All fields are mandatory")
            }

        const phonenumber = await db.query(`select * from users where phone_number = $1`,
            [phone_number]
        )
        if(phonenumber.rows.length>0){
            return res.send("Phone number already present")
        }

        const Email = await db.query(`select * from users where email = $1`,
            [email]
        )
        if(Email.rows.length>0){
            return res.send("email already present")
        }


        const hashedPassword = await bcrypt.hashPassword(password)

        await db.query(
            `insert into users(name,phone_number,password,email,gender,dob,blood_group,address,city)
            values( $1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
                name,phone_number,hashedPassword,email,gender,dob,blood_group,address,city
            ]
        )

        // alert('User registered successfully')
        res.redirect('/')

    } catch (err) {
        console.error(err);

        res.status(500).send("Internal Server Error");
    }
}

const loginUser = async (req,res)=>{
    console.log(req.body)
     console.log("User Login page")

try {
         const {email,password} = req.body
    
         const result = await db.query(
            `select * from users
             where email = $1 `,
            [email])
        
            console.log(result.rows)
            if(result.rows.length===0){
                return res.send("User not found")
            }
    
            let user = result.rows[0]
            let hashed = user.password
    
            // let compare = await bcrypt.comparePassword(hashed,password)
            const compare = await bcrypt.comparePassword(
    
                password,
    
                user.password
    
            );
            if(!compare){
                return res.send("Incorrect Password");
            }
    
            let token = tokener.generateToken(user)
            res.cookie("token",token,
                {
    
                    httpOnly: true,
                    secure: false,
                    sameSite: "lax",
                    maxAge: 24 * 60 * 60 * 1000
    
                }
            );
    
console.log("User logged in")
            return res.redirect('/dashboard')

} catch (err) {
 
     console.error(err);

    res.status(500).render('index', {loginError: "Invalid email or password.",
    registerError: null});
}


}


const logoutUser = (req,res)=>{

    console.log(req.body)
    res.clearCookie('token')
    res.redirect('/')
}

module.exports = {
    showHome,
    registerUser,
    loginUser,
    logoutUser
}