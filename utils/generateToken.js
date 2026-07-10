const jwt = require('jsonwebtoken')
require('dotenv').config()
const key = process.env.BHADRA

const generateToken = (user)=>{

    let payload = {
       user_id: user.user_id,
       email : user.email
    }
    const token = jwt.sign(payload,key,{
        expiresIn:'1d'
    })

    return token
}

module.exports = {generateToken}