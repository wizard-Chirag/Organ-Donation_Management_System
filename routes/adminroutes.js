const exp = require('express')
const router = exp.Router()

const {registerHospital,showadmin}=require('../controllers/adminController')

router.get('/adminAnthamma',showadmin)
router.post('/adminAnthamma',registerHospital)

module.exports = router