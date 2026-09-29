const exp = require('express')
const router = exp.Router()

const {verifyUserToken} = require('../middleware/verifytoken')

const uploadFolder = require("../middleware/uploads");
const recipientFolder = uploadFolder('RecipientDocs')


const {
    createRecipient,
    showRecipientProfile
} = require('../controllers/recipeientController')

router.get('/recipient',verifyUserToken,showRecipientProfile)

router.post('/recipient',verifyUserToken, createRecipient, recipientFolder.single('medical_report'))

module.exports = router