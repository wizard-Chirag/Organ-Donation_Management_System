const db = require("../config/db");
const bcrypt = require('../utils/passwords')


const registerHospital= async (req,res)=>{
    // console.log(req.body)
    console.log("User registration")
    // res.send("User registration")

    try {
        const {id,name,email,contact_number,password,license_number,city,status,transplant_beds} = req.body

        console.log(name,email,contact_number,password,license_number,city,status,transplant_beds)
        if(!id || !name || !email || !contact_number 
            || !password || !license_number || !city || !status || !transplant_beds)
            {
                return res.send("All fields are mandatory")
            }

        const contact = await db.query(`select * from hospital where contact_number = $1`,
            [contact_number]
        )
        if(contact.rows.length>0){
            return res.send("Phone number already present")
        }

        const Licence = await db.query(`select * from hospital where license_no = $1`,
            [license_number]
        )
        if(Licence.rows.length>0){
            return res.send("email already present")
        }


        const hashedPassword = await bcrypt.hashPassword(password)

        await db.query(
            `insert into hospital(hospital_id,hospital_name,hospital_email,contact_number,hospital_password,license_no,city,status,transplant_beds)
            values( $1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
                id,name,email,contact_number,hashedPassword,license_number,city,status,transplant_beds
            ]
        )

        console.log('Hospital registered successfully')
        res.redirect('/adminAnthamma')

    } catch (err) {
        console.error(err);

        res.status(500).send("Internal Server Error");
    }
}

const showadmin = (req,res)=>{
    res.render('adminindex')
}

module.exports={registerHospital,showadmin}