const exp = require('express')
const path = require('path')
const cookieParser = require("cookie-parser");
const app=exp()
require('dotenv').config()

const port = process.env.PORT
app.listen(port,()=>{
    console.log(`Server running on port ${port}`)
})
app.use(exp.urlencoded({extended:true}))
app.use(exp.json())

app.use(exp.static(path.join(__dirname, "public")));
app.use(cookieParser())

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use("/uploads",exp.static("uploads"));

const authroutes = require('../Organ-Donation_Management_System/routes/authroutes')
app.use('/',authroutes)

const dashroutes = require('../Organ-Donation_Management_System/routes/dashboardrotes')
app.use('/',dashroutes)

const profileroutes = require('../Organ-Donation_Management_System/routes/profileroutes')
app.use('/',profileroutes)

const medicalPortal = require('../Organ-Donation_Management_System/routes/medicalPortal')
app.use('/',medicalPortal)

const donorroutes = require('../Organ-Donation_Management_System/routes/donorroutes')
app.use('/',donorroutes)

// app.get('/',(req,res)=>{
//     res.render('index')
// })   