// READY FOR LAUNCH
const exp = require('express')
const router = exp.Router()

const { verifyUserToken, verifyProfileToken } = require('../middleware/verifytoken')

// DONOR FOLDER TO STORE DONOR DOCUMENTS
const uploadFolder = require("../middleware/uploads");
const donoFolder = uploadFolder('DonorDocs')

const {
    showDonorProfile,
    createDonorProfile,
    updateDonorProfile,
    showDonorUpdateProfile,
    showProfileLogin,
    unLockProfile,
    ShowregisterOrgan,
    registerOrgan
} = require('../controllers/donorController')

// LOGIN PAGE
router.get('/donor/login', verifyUserToken, showProfileLogin)
router.post('/donor/login', verifyUserToken, unLockProfile)
router.post('/donor/login/action', verifyUserToken, unLockProfile)

// DONOR OFFICIAL PROFILE
router.get('/donor', verifyUserToken, showDonorProfile)

// CREATION OF PROFILE
router.post("/donor", verifyUserToken, donoFolder.single("medical_report"), createDonorProfile);

// UPDATE THE PROFILE DETAILS
router.get("/donor/update", verifyUserToken, showDonorUpdateProfile);
router.post("/donor/update", verifyUserToken, donoFolder.single("medical_report"), updateDonorProfile);

// ORGAN LISTING PAGE
router.get('/donor/register_organ', verifyUserToken, verifyProfileToken, ShowregisterOrgan)
router.get('/donor/register-organ', verifyUserToken, verifyProfileToken, ShowregisterOrgan)
router.post('/donor/register_organ', verifyUserToken, verifyProfileToken, donoFolder.single("medical_report"), registerOrgan)
router.post('/donor/register-organ', verifyUserToken, verifyProfileToken, donoFolder.single("medical_report"), registerOrgan)

module.exports = router