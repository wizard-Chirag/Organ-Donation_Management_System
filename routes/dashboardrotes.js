const exp = require('express')

const router = exp.Router()

const verifyToken = require('../middleware/verifytoken')

const {showDash} = require('../controllers/dashboardcontroller')

router.get('/dashboard',verifyToken,showDash)

module.exports = router