const exp = require('express')
const router = exp.Router()

const {
    showOrganDashboard,
    showDonorOrganPage
} = require('../../controllers/hospital/hospitalOrganPage')
const { verifyHospitalToken } = require('../../middleware/verifytoken')

router.get('/hospital/organ-requests',verifyHospitalToken,showOrganDashboard)
router.get('/hospital/donor_organ-listings',verifyHospitalToken,showDonorOrganPage)

module.exports = router