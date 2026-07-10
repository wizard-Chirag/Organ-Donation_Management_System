const bcrypt = require('bcrypt')
const salt_rounds = 10

const hashPassword = (password)=>{

    const hashed = bcrypt.hash(password,10)
    return hashed
}

const comparePassword = (currentPassword,hashedPassword) =>{

    const isMatch = bcrypt.compare(currentPassword,hashedPassword)
    return isMatch
}

module.exports={hashPassword,comparePassword}