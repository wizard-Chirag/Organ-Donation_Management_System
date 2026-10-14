const exp = require('express')
const router = exp.Router()

const {
    showOrganDashboard,
    showDonorOrganPage,
    DonorOrganAction
} = require('../../controllers/hospital/hospitalOrganPage')
const { verifyHospitalToken } = require('../../middleware/verifytoken')

router.get('/hospital/organ-requests',verifyHospitalToken,showOrganDashboard)
router.get('/hospital/donor_organ-listings',verifyHospitalToken,showDonorOrganPage)
router.post('/hospital/donor_organ-listings',verifyHospitalToken,DonorOrganAction)

module.exports = router