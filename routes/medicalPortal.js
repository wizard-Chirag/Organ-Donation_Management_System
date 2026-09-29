// READY FOR LAUNCH
const exp = require('express')

const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const {
    createMedicalProfile,
    showMedicalPortal
} = require('../controllers/medical_profileController')

router.get('/medical',verifyUserToken,showMedicalPortal)

router.post('/medical',verifyUserToken,createMedicalProfile)

module.exports=router