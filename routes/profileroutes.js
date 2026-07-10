const exp = require('express')

const router = exp.Router()

const verifyToken = require('../middleware/verifytoken')

const {showProfile} = require('../controllers/profilescontroller')

router.get('/profile',verifyToken,showProfile)

module.exports = router