// READY FOR LAUNCH
const exp = require('express')
const router = exp.Router()

const verifyToken = require('../middleware/verifytoken')

// DONOR FOLDER TO STORE DONOR DOCUMENTS
// uploadFolder => FUNCTION TO ACCEPT A FILE/S AND STORE IT IN DESIRED LOCATION
const uploadFolder = require("../middleware/uploads");
// // donorFolder => FUNCTION CALL FOR uploadFolder TO STORE DONOR FILES IN DonorDocs FOLDER
const donoFolder = uploadFolder('DonorDocs')

const {
    showDonorProfile,
    createDonorProfile
} = require('../controllers/donorController')

router.get('/donor',verifyToken,showDonorProfile)
// router.get('/donor/update',verifyToken,showDonorProfile)

router.post("/donor", verifyToken, donoFolder.single("medical_report"), createDonorProfile );
// router.post("/donor/update", verifyToken, donoFolder.single("medical_report"), createDonorProfile );

module.exports = router