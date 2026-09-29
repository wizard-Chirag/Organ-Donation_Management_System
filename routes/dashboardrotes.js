const exp = require('express')

const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const {showDash} = require('../controllers/dashboardcontroller')

router.get('/dashboard',verifyUserToken,showDash)

module.exports = router