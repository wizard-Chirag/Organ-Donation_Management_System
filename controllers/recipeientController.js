const db = require('../config/db')
const {comparePassword} = require('../utils/passwords')


const showRecipientProfile = async (req,res) => {

    try {

        const user_id = req.user.user_id

        const user = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )
        const recipient = await db.query(
            `select * from recipient_profile
            where user_id =$1`,
            [user_id]
        ) 
    
        if(recipient.rows.length>0){
            console.log("Showing recipient profile ")
            const hospital = await db.query(
                `select * from hospital
                where hospital_id =$1`,
                [recipient.rows[0].registered_hospital_id]
            )
            return res.render('recipient/recipientDashboard',{
                user:user.rows[0],
                recipient:recipient.rows[0],
                hospital:hospital.rows[0]
            })
        }

        const medical_record = await db.query(
            `select * from user_medical_info
            where user_id = $1`,
            [user_id]
        )



        if(medical_record.rows.length>0){

            const hospital = await db.query(
                `select hospital_name, hospital_id from hospital`
            )

            console.log('Recipient Profile creation page Loaded')
            return res.render('recipient/createRecipient',{
                user:user.rows[0],
                hospitals:hospital.rows
            })
        }

        console.log('User Medical page not present')
        return res.redirect('/medical')

    } catch (error) {
        console.log(error)
        res.status(500).send("Internal Server Error");
    }
}

const createRecipient = async (req,res) => {

    try {
        const user_id = req.user.user_id
        console.log(req.body);
        const {
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
        
        const hospital = await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospital_id]
        )

        if(hospital.rows.length==0){
           return res.send('Select a valid Hospital')
        }

        const user = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )
        const hashPassword = user.rows[0].password

        const result = await comparePassword(password,hashPassword)

        if(!result){
           return  res.send('Enter valid password')
        }

        await db.query(
            `insert into recipient_profile
            (user_id,recipient_status,registered_hospital_id,attested_document_path,verification_status)
            values($1,$2,$3,$4,$5)`,
            [user_id,'Active',hospital_id,legal_document.path,'Pending']
        )
        console.log("Recipient profile request created")

        return res.redirect('/dashboard')



    } catch (error) {
        console.log(error)
        res.status(500).send("Internal Server Error");
    }

}

const showUpdateRecipient = async (req,res) => {
    
    try {
        const user_id = req.user.user_id

        const user = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )
        const recipient = await db.query(
            `select * from recipient_profile
            where user_id =$1`,
            [user_id]
        ) 
        if(recipient.rows.length==0){
            return res.redirect('/recipient')
        }

        const hospital = await db.query(
                `select hospital_name, hospital_id from hospital`
            )

        return res.render('recipient/updateRecipient',{
            user:user.rows[0],
            hospitals:hospital.rows
        })

    } catch (error) {
        console.log(error)
        res.send('Internal server error')
    }
}

const updateRecipientProfile = async (req,res) => {
    
     try {
        const user_id = req.user.user_id
        
        const {
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
        
        const hospital = await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospital_id]
        )

        if(hospital.rows.length==0){
           return res.send('Select a valid Hospital')
        }

        const user = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )
        const hashPassword = user.rows[0].password

        const result = await comparePassword(password,hashPassword)

        if(!result){
           return  res.send('Enter valid password')
        }

        await db.query(
            `update recipient_profile set
            registered_hospital_id =$1,
            attested_document_path =$2
            where user_id = $3`,
            [hospital_id,legal_document.path,user_id]
        )
        console.log("Recipient profile request Updated")

        return res.redirect('/dashboard')



    } catch (error) {
        console.log(error)
        res.status(500).send("Internal Server Error");
    }


}

module.exports = {
    createRecipient,
    showRecipientProfile,
    showUpdateRecipient,
    updateRecipientProfile
}