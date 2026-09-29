const exp = require('express')

const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const {showProfile} = require('../controllers/profilescontroller')

router.get('/profile',verifyUserToken,showProfile)

module.exports = router