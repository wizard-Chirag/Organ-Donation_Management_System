const exp = require('express')
const router = exp.Router()

const verifyToken = require('../middleware/verifytoken')

const uploadFolder = require("../middleware/uploads");
const recipientFolder = uploadFolder('RecipientDocs')


const {
    createRecipient,
    showRecipientProfile
} = require('../controllers/recipeientController')

router.get('/recipient',verifyToken,showRecipientProfile)

router.post('/recipient',verifyToken, createRecipient, recipientFolder.single('medical_report'))

module.exports = router