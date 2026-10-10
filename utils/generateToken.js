const jwt = require('jsonwebtoken')
require('dotenv').config()
const patientKey = process.env.patientBHADRA
const profileKey = process.env.profileBHADRA
const hospitalKey = process.env.hospitalBHADRA

const GenerateToken = (user)=>{

    let payload = {
       user_id: user.user_id
    }
    const token = jwt.sign(payload,patientKey,{
        expiresIn:'1d'
    })

    return token
}

const ProfileToken = (id)=>{

    let payload = {
       profile_id: id
    }
    const Profiletoken = jwt.sign(payload,profileKey,{
        expiresIn:'5m'
    })

    return Profiletoken
}

const hospitalGenToken = (hospital)=>{

    let payload = {
        hospital_id:hospital.hospital_id,
        hospital_name:hospital.hospital_name
    }

    const hospitalToken = jwt.sign(payload,hospitalKey,{
        expiresIn:'1d'
    })

    return hospitalToken
}

module.exports = {GenerateToken,ProfileToken,hospitalGenToken}