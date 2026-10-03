const exp = require('express')
const router = exp.Router()

const {
    showProfileReqestDash,
    manageRequests,
    requestAction,
    manageRecipientRequests,
    RecipientRequestAction
} = require('../../controllers/hospital/hospitalController')
const { verifyHospitalToken } = require('../../middleware/verifytoken')

router.get('/hospital/profile-requests',verifyHospitalToken,showProfileReqestDash)

router.get('/hospital/profile-requests/donor',verifyHospitalToken,manageRequests)
router.post('/hospital/profile-requests/donor/action',verifyHospitalToken,requestAction)

router.get('/hospital/profile-requests/recipients',verifyHospitalToken,manageRecipientRequests)
router.post('/hospital/profile-requests/recipient/action',verifyHospitalToken,RecipientRequestAction)

module.exports = router