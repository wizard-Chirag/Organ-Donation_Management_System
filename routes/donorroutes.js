// READY FOR LAUNCH
const exp = require('express')
const router = exp.Router()

const { verifyUserToken, verifyDprofileToken } = require('../middleware/verifytoken')

// DONOR FOLDER TO STORE DONOR DOCUMENTS
const uploadFolder = require("../middleware/uploads");
const donoFolder = uploadFolder('DonorDocs')

const {
    createDonorProfile,
    updateDonorProfile,
    showDonorUpdateProfile,
    showProfileLogin,
    unLockProfile,
    ShowregisterOrgan,
    registerOrgan,
    showDonorOrgans,
    showUpdateOrganListing,
    updateOrganListing,
    cancelOrganListing,
    DonorCreationOnLogin,
    showDonorCreation,
    showDonorDashboard
} = require('../controllers/donorController')

// // DONOR OFFICIAL PROFILE
// router.get('/donor', verifyUserToken, showProfileLogin)

// // LOGIN PAGE
// router.get('/donor/login', verifyUserToken, showProfileLogin)
// router.post('/donor/login', verifyUserToken, unLockProfile)
// router.post('/donor/login/action', verifyUserToken, unLockProfile)

// // CREATION OF PROFILE
// router.get('/donorCreateOnLogin',verifyUserToken,DonorCreationOnLogin)
// router.post("/donor", verifyUserToken, donoFolder.single("medical_report"), createDonorProfile)
// ;

router.get('/donor/login',verifyUserToken,showProfileLogin)
router.post('/donor/login/action', verifyUserToken, unLockProfile)

router.get('/donorCreateOnLogin',verifyUserToken,DonorCreationOnLogin)

router.get('/donor/create',verifyUserToken,showDonorCreation)
router.post('/donor/create',verifyUserToken,donoFolder.single("medical_report"),createDonorProfile)

router.get('/donor/dashboard',verifyUserToken,verifyDprofileToken,showDonorDashboard)

// UPDATE THE PROFILE DETAILS
router.get("/donor/update", verifyUserToken, verifyDprofileToken, showDonorUpdateProfile);
router.post("/donor/update", verifyUserToken, verifyDprofileToken, donoFolder.single("medical_report"), updateDonorProfile);

// ORGAN LISTING PAGE
router.get('/donor/register_organ', verifyUserToken, verifyDprofileToken, ShowregisterOrgan)
router.post('/donor/register_organ', verifyUserToken, verifyDprofileToken, donoFolder.single("medical_report"), registerOrgan)


// DONOR LISTED ORGANS & MANAGEMENT
router.get('/donor/organ/:id/edit', verifyUserToken, verifyDprofileToken, showUpdateOrganListing);
router.get('/donor/organs', verifyUserToken, verifyDprofileToken, showDonorOrgans);
router.post('/donor/organ/:id/edit', verifyUserToken, verifyDprofileToken, donoFolder.single("medical_report"), updateOrganListing);
router.post('/donor/organ/:id/cancel', verifyUserToken, verifyDprofileToken, cancelOrganListing);

module.exports = router
