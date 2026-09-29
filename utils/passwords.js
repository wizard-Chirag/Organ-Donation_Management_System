const bcrypt = require('bcrypt')
const salt_rounds = 10

const hashPassword = (password)=>{

    const hashed = bcrypt.hash(password,salt_rounds)
    return hashed
}

const comparePassword = (currentPassword,hashedPassword) =>{

    return bcrypt.compare(currentPassword,hashedPassword)
}

module.exports={hashPassword,comparePassword}