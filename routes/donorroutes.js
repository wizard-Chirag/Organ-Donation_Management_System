// READY FOR LAUNCH
const exp = require('express')
const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

// DONOR FOLDER TO STORE DONOR DOCUMENTS
// uploadFolder => FUNCTION TO ACCEPT A FILE/S AND STORE IT IN DESIRED LOCATION
const uploadFolder = require("../middleware/uploads");
// // donorFolder => FUNCTION CALL FOR uploadFolder TO STORE DONOR FILES IN DonorDocs FOLDER
const donoFolder = uploadFolder('DonorDocs')

const {
    showDonorProfile,
    createDonorProfile,
    updateDonorProfile,
    showDonorUpdateProfile,
    showProfileLogin,
    unLockProfile
} = require('../controllers/donorController')

// LOGIN PAGE
router.get('/donor/login',verifyUserToken,showProfileLogin)
router.post('/donor/login',verifyUserToken,unLockProfile)

// DONOR OFFICIAL PROFILE
router.get('/donor',verifyUserToken,showDonorProfile)

// CREATION OF PROFILE
router.post("/donor", verifyUserToken, donoFolder.single("medical_report"), createDonorProfile );

//UPDATE THE PROFILE DETAILS
router.get("/donor/update", verifyUserToken, donoFolder.single("medical_report"), showDonorUpdateProfile );
router.post("/donor/update", verifyUserToken, donoFolder.single("medical_report"), updateDonorProfile );

module.exports = router