const bcrypt = require('bcrypt')
const salt_rounds = 10

const hashPassword = async (password) => {
    return await bcrypt.hash(password, salt_rounds)
}

const comparePassword = async (currentPassword, hashedPassword) => {
    return await bcrypt.compare(currentPassword, hashedPassword)
}

module.exports = { hashPassword, comparePassword }