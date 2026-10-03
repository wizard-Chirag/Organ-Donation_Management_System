const db = require('../../config/db')
const {comparePassword} = require('../../utils/passwords')
const {hospitalGenToken} = require('../../utils/generateToken')


const showLogin = (req,res)=>{

    res.render('hospital/hospitalindex',{
        error:null,
    })
}

const hospitalLogin = async(req,res) =>{

    console.log("Hospital login page loaded")
    try {
        const{hospital_id,password}=req.body

        if(!password || !hospital_id){
            res.render('hospital/hospitalindex',{
        error:'details_missing',
    })
        }
        const hospital=await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospital_id]
        )

        if(hospital.rows.length==0){
            return res.status(404).send("Hospital Not found in Records")
        }

        let hashpassword = hospital.rows[0].hospital_password
        const compare = comparePassword(password,hashpassword)
        if(!compare){
            return res.status(404).send("Incorrect password")
        }

        let hospitalToken = hospitalGenToken(hospital.rows[0])
        res.cookie('hospitalToken',hospitalToken,{

                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000
        })
        

        console.log("Hospital logged in")
        return res.redirect('/hospitalDashboard')
    } catch (error) {
        
        console.log(error)
        return res.status(500).send('Internal server error')
    }
}

const logout = (req,res)=>{

    res.clearCookie('token')
    console.log("Hospital logged out")
    return res.redirect('/hospital')
}

const showDash = async (req,res)=>{
    const hospitalId = req.hospital.hospital_id

    const hospital = await db.query(
            `select * from hospital
            where hospital_id = $1`,
            [hospitalId]
        )

    res.render('hospital/hospitalDashboard',{
        hospital:hospital.rows[0]
    })
}


module.exports={
    logout,
    hospitalLogin,
    showDash,
    showLogin
}