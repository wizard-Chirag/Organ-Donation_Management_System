const exp = require('express')
const router = exp.Router()

const {
    showProfileReqestDash,
    manageRequests,
    requestAction
} = require('../../controllers/hospital/hospitalController')
const { verifyHospitalToken } = require('../../middleware/verifytoken')

router.get('/hospital/profile-requests',verifyHospitalToken,showProfileReqestDash)
router.get('/hospital/profile-requests/donor',verifyHospitalToken,manageRequests)
router.post('/hospital/profile-requests/action',verifyHospitalToken,requestAction)

module.exports = router