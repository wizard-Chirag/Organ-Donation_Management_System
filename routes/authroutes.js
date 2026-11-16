const experss = require('express')

const router =experss.Router()

const authfunctions = require('../controllers/authcontroller')
// const {verifyUserToken} = require("../middleware/verifytoken");

router.get('/',authfunctions.showHome)
router.post('/login',authfunctions.loginUser)
router.post('/register',authfunctions.registerUser)
router.get('/logout',authfunctions.logoutUser)

router.get('/forgotPassword',authfunctions.getForgotPassword)
router.post('/forgotPassword',authfunctions.ResetProfilePassword)

module.exports = router