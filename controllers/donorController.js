// READY FOR LAUNCH
const db = require('../config/db')
const { comparePassword } = require('../utils/passwords')


const showDonorProfile = async (req,res)=>{

    try {
        const user_id = req.user.user_id
    
        const user = await db.query(
            `select * from users
             where user_id = $1`,
             [user_id]
        )

        const donor = await db.query(
            `select * from donor_profile
            where user_id = $1`,
            [user_id]
        )

        if(donor.rows.length>0)
        {
            const donorHospital = await db.query(
            `select hospital_name from hospital
             where hospital_id = $1`,
             [donor.rows[0].registered_hospital_id]
            )
            

            console.log("Showing donor profile ")
            return res.render('donor/donorDashboard',{
                user:user.rows[0],
                donor:donor.rows[0],
                hospital:donorHospital.rows[0]
        })
        }

        // checking for existance of MEDICAL PROFILE OF THE USER
        const medical_record = await db.query(
            `select * from user_medical_info
            where user_id = $1`,
            [user_id]
        )

        const hospitals = await db.query(
            `select hospital_id, hospital_name from hospital
            order by hospital_name ASC`
        )

        // IF MEDICAL PROFILE PRESENT THEN GO TO CREATE DONOR_PROFILE
        if(medical_record.rows.length>0)
        {
            console.log("Create Donor Page opened")
            return res.render('donor/createDonor',{
                user:user.rows[0],
                hospitals:hospitals.rows,
                donor:true
            })  
        }

        // IF NOT PRESENT THEN GO FILL THE MEDICAL PROFILE
        console.log('User Medical page not present')
        return res.redirect('/medical')

    } catch (err) {
        
        console.log(err)
        res.status(500).send("Internal Server Error");
    }
}

const createDonorProfile = async (req,res)=>{

    // return res.send("Donor Creation Module in progress")
    const user_id = req.user.user_id
    try {
        
        const {
            // legal_document,
            hospital_id,
            password
        } = req.body

        const legal_document = req.file;

        if(
            !legal_document ||
            !hospital_id ||
            !password
        ){
            return res.send("All fields are mandatory")
        }

        const user = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )

        const hospitalName = await db.query(
            `select hospital_name from hospital
            where hospital_id = $1`,
            [hospital_id]
        )

        const hashedpassword = user.rows[0].password

        const compare = await comparePassword(password,hashedpassword) 

        if(!compare){
            console.log("Invalid password for donor_profile creation")
            return res.send("Incorrect Password")
        }

        if(hospitalName.rows[0]===0){
             console.log("Invalid hospital")
            return res.send("Incorrect hospital details")
        }

        const donor = await db.query(
            `select * from donor_profile
            where user_id = $1`,
            [user_id]
        )

        if(donor.rows.length>0 && donor.rows[0].verification_status != 'Approved'){
            await db.query(
                `update donor_profile set
                hospital_name = $1,
                
                attested_document_path = $2
                where user_id = $3`,
                [hospital_id,legal_document.path,user_id]
            )
            console.log("Donor profile request updated")
            return res.redirect('/dashboard')
        }

        await db.query(
            `insert into donor_profile
            (user_id,donor_status,registered_hospital_id,attested_document_path,verification_status)
            values($1,$2,$3,$4,$5)`,
            [user_id,'Active',hospital_id,legal_document.path,'Pending']
        )
        console.log("Donor profile request created")

        return res.redirect('/dashboard')
    } catch (err) {
        console.log(err)
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    createDonorProfile,
    showDonorProfile
}
