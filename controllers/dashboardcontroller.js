const db = require('../config/db')

// const showDash = async (req,res)=>{

//     try {
//         // CHECK FOR DONOR PROFILE EXISTANCE
//         const user_id = req.user.user_id

//         const result1 = await db.query(
//             `select * from users
//             where user_id = $1`,
//             [user_id]
//         )

//         if(result1.rows.length===0){
//             return res.redirect('/logout')
//         }

//         let user = result1.rows[0]

//         const donor = await db.query(
//             `select donor_id from donor_profile
//             where user_id = $1`,
//             [user_id]
//         )

//         const recipient = await db.query(
//             `select recipient_id from recipient_profile
//             where user_id = $1`,
//             [user_id]
//         )

//         const hasDonorProfile = donor.rows.length>0
//         const hasRecipientProfile = recipient.rows.length>0

//         // IF U HAVE A REGULAR IF STATEMENT CHECKING FOR EXISTANCE FOR DONOR AND RECIPENT PROFILE,
//         //  U WILL END UP IN A SITUATION THAT DOESNOT PERMIT USER EXISTANCE WITHOUT CO-EXISTANCE OF DONOR AND RECIPIENT PROFILE

//     } catch (err) {
//         console.log(err)

//         res.send("Internal server error MAYBEE donor/ recipient profile not found")
//     }
// }


const showDash = (req, res) => {

    res.render("dashboard");

};

module.exports = {

    showDash

};