const exp = require('express')
const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const uploadFolder = require("../middleware/uploads");
const recipientFolder = uploadFolder('RecipientDocs')


const {
    createRecipient,    
    showRecipientProfile,
    showUpdateRecipient,
    updateRecipientProfile
} = require('../controllers/recipeientController')

router.get('/recipient',verifyUserToken,showRecipientProfile)
router.get('/recipient/update',verifyUserToken,showUpdateRecipient)

router.post('/recipient',verifyUserToken, recipientFolder.single('medical_report'), createRecipient)
router.post('/recipient/update',verifyUserToken, recipientFolder.single('medical_report'), updateRecipientProfile)

module.exports = router