const exp = require('express')
const router = exp.Router()

const {
    showOrganDashboard,
    showDonorOrganPage,
    DonorOrganAction,
    serveOrganReport
} = require('../../controllers/hospital/hospitalOrganPage')
const { verifyHospitalToken } = require('../../middleware/verifytoken')

router.get('/hospital/organ-requests', verifyHospitalToken, showOrganDashboard)
router.get('/hospital/donor_organ-listings', verifyHospitalToken, showDonorOrganPage)

// Action route (approve / reject) — matches the fetch() URL in donor_organ.ejs
router.post('/hospital/organ-listings/action', verifyHospitalToken, DonorOrganAction)

// Medical report route — opens the uploaded PDF/document inline in the browser
router.get('/hospital/organ-listings/:id/report', verifyHospitalToken, serveOrganReport)

module.exports = router