const experss = require('express')

const router =experss.Router()

const authfunctions = require('../controllers/authcontroller')
// const {verifyUserToken} = require("../middleware/verifytoken");

router.get('/',authfunctions.showHome)
router.post('/login',authfunctions.loginUser)
router.post('/register',authfunctions.registerUser)
router.get('/logout',authfunctions.logoutUser)

module.exports = router