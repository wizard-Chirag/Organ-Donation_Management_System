const bcrypt = require('bcrypt')
const salt_rounds = 10

const hashPassword = (password)=>{

    const hashed = bcrypt.hash(password,10)
    return hashed
}

const comparePassword = (currentPassword,hashedPassword) =>{

    return bcrypt.compare(currentPassword,hashedPassword)
}

module.exports={hashPassword,comparePassword}