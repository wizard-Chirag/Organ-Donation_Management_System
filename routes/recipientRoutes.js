const exp = require('express')
const router = exp.Router()

const {verifyUserToken,
    verifyRprofileToken
} = require('../middleware/verifytoken')

const uploadFolder = require("../middleware/uploads");
const recipientFolder = uploadFolder('RecipientDocs')


const {
    createRecipient,    
    showRecipientProfile,
    showUpdateRecipient,
    updateRecipientProfile,
    showProfileLogin,
    unLockProfile,
    recipientCreationOnLogin,
    RecipientCreationOnLogin,
    showRecipientCreation,
    showRecipientDashboard,
    showCreateOrganRequest,
    createOrganRequest,
    showRecipientRequests,
    showRenewOrganRequest,
    submitRenewOrganRequest,
    cancelOrganRequest
} = require('../controllers/recipeientController')

// // STANDALONE PROFILE DASHBOARd

// // SHOW PROFILE LOGIN PAGE AND UNLOCK
// router.get('/recipient/login',verifyUserToken,showProfileLogin)
// router.post('/recipient/login',verifyUserToken,unLockProfile)
// router.post('/recipient/login/action',verifyUserToken,unLockProfile)

// // PROFILE CREATION AND SHOW
// router.get('/recipientCreateOnLogin',verifyUserToken,recipientCreationOnLogin)
// router.get('/recipient',verifyUserToken,showRecipientProfile)
// router.post('/recipient',verifyUserToken, recipientFolder.single('medical_report'), createRecipient)

router.get('/recipient/login',verifyUserToken,showProfileLogin)
router.post('/recipient/login/action', verifyUserToken, unLockProfile)

router.get('/recipientCreateOnLogin',verifyUserToken,RecipientCreationOnLogin)

router.get('/recipient/create',verifyUserToken,showRecipientCreation)
router.post('/recipient/create',verifyUserToken,recipientFolder.single('medical_report'),createRecipient)

router.get('/recipient/dashboard',verifyUserToken,verifyRprofileToken,showRecipientDashboard)
// PROFILE UPDATION

router.get('/recipient/update',verifyUserToken,verifyRprofileToken,showUpdateRecipient)
router.post('/recipient/update',verifyUserToken,verifyRprofileToken, recipientFolder.single('medical_report'), updateRecipientProfile)

// ─── Recipient Organ Requests ──────────────────────────────────────────────
router.get('/recipient/organ', verifyUserToken, verifyRprofileToken, showCreateOrganRequest)
router.post('/recipient/organ', verifyUserToken, verifyRprofileToken, recipientFolder.single('medical_report'), createOrganRequest)

router.get('/recipient/organs', verifyUserToken, verifyRprofileToken, showRecipientRequests)

router.get('/recipient/organ/:id/renew', verifyUserToken, verifyRprofileToken, showRenewOrganRequest)
router.post('/recipient/organ/:id/renew', verifyUserToken, verifyRprofileToken, recipientFolder.single('medical_report'), submitRenewOrganRequest)

router.post('/recipient/organ/:id/cancel', verifyUserToken, verifyRprofileToken, cancelOrganRequest)

module.exports = router