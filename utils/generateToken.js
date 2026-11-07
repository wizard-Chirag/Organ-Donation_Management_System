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

const DonerToken = (id,type)=>{

    let payload = {
       profile_id: id,
       profile_type:type
    }
    const Profiletoken = jwt.sign(payload,profileKey,{
        expiresIn:'7m'
    })

    return Profiletoken
}

const RecipientToken = (id,type)=>{

    let payload = {
       profile_id: id,
       profile_type:type
    }
    const Profiletoken = jwt.sign(payload,profileKey,{
        expiresIn:'7m'
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

module.exports = {GenerateToken,DonerToken,RecipientToken,hospitalGenToken}