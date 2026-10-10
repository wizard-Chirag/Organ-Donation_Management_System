const exp = require('express')
const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const uploadFolder = require("../middleware/uploads");
const recipientFolder = uploadFolder('RecipientDocs')


const {
    createRecipient,    
    showRecipientProfile,
    showUpdateRecipient,
    updateRecipientProfile,
    showProfileLogin,
    unLockProfile
} = require('../controllers/recipeientController')

router.get('/recipient/login',verifyUserToken,showProfileLogin)

router.get('/recipient',verifyUserToken,showRecipientProfile)
router.get('/recipient/update',verifyUserToken,showUpdateRecipient)

router.post('/recipient',verifyUserToken, recipientFolder.single('medical_report'), createRecipient)
router.post('/recipient/update',verifyUserToken, recipientFolder.single('medical_report'), updateRecipientProfile)

router.post('/recipient/login',verifyUserToken,unLockProfile)
router.post('/recipient/login/action',verifyUserToken,unLockProfile)

module.exports = router