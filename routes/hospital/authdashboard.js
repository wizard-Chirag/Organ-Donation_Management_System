const exp = require('express')
const router = exp.Router()

const {logout,
    hospitalLogin,
    showDash,
    showLogin} = require('../../controllers/hospital/hospital_auth')

const{verifyHospitalToken} = require('../../middleware/verifytoken')

// HOME INDEX
router.get('/hospital',showLogin)

router.post('/hospital/login',hospitalLogin)

router.post('/hospital/logout',logout)

// DASHBOARD
router.get('/hospitalDashboard',verifyHospitalToken,showDash)

module.exports = router