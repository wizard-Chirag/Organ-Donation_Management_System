const db = require('../config/db')

const showProfile = async (req,res)=>{
    try {
        // CHECK FOR DONOR PROFILE EXISTANCE
        const user_id = req.user.user_id

        const result1 = await db.query(
            `select * from users
            where user_id = $1`,
            [user_id]
        )

        if(result1.rows.length===0){
            return res.redirect('/logout')
        }

        let user = result1.rows[0]

        res.render('profiles',{user:user})

    } catch (err) {
          console.error(err);

        res.status(500).send("Internal Server Error");

    }
    
}

module.exports = {showProfile}