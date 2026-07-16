// READY FOR LAUNCH
const exp = require('express')

const router = exp.Router()

const verifyToken = require('../middleware/verifytoken')

const {
    createMedicalProfile,
    showMedicalPortal
} = require('../controllers/medical_profileController')

router.get('/medical',verifyToken,showMedicalPortal)

router.post('/medical',verifyToken,createMedicalProfile)

module.exports=router