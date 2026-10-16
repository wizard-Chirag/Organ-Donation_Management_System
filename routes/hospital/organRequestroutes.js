const exp = require('express')
const router = exp.Router()

const {
    showOrganDashboard,
    showDonorOrganPage,
    DonorOrganAction,
    serveOrganReport,
    showOrganRequestPage,
    OrganRequestAction,
    renewOrganRequest
} = require('../../controllers/hospital/hospitalOrganPage')

const { verifyHospitalToken, verifyUserToken } = require('../../middleware/verifytoken')

// ── Donor organ listing routes ──────────────────────────────────────────────
router.get('/hospital/organ-requests',       verifyHospitalToken, showOrganDashboard)
router.get('/hospital/donor_organ-listings', verifyHospitalToken, showDonorOrganPage)

// approve / reject a donor organ listing
router.post('/hospital/organ-listings/action',    verifyHospitalToken, DonorOrganAction)

// serve the uploaded medical PDF inline
router.get('/hospital/organ-listings/:id/report', verifyHospitalToken, serveOrganReport)

// ── Recipient organ REQUEST routes (organ_request table) ────────────────────
// hospital views all recipient organ requests (sorted by criticality_score DESC)
router.get('/hospital/organ-requests/list',    verifyHospitalToken, showOrganRequestPage)

// hospital approves or rejects a recipient organ request
router.post('/hospital/organ-requests/action', verifyHospitalToken, OrganRequestAction)

// recipient renews an expired ("Renewal Required") organ request
router.post('/recipient/organ-request/:id/renew', verifyUserToken, renewOrganRequest)

module.exports = router