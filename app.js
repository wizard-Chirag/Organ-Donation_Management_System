const exp = require('express')
const path = require('path')
const cookieParser = require("cookie-parser");
const app = exp()
require('dotenv').config()

const port = process.env.PORT || 3000

app.use(exp.urlencoded({extended:true}))
app.use(exp.json())

app.use(exp.static(path.join(__dirname, 'public')));
app.use(cookieParser())

app.set('view engine','ejs')
app.set('views',[
    (path.join(__dirname,'views')),
    (path.join(__dirname,'views','hospital'))
])

app.use("/uploads", exp.static(path.join(__dirname, "uploads")));

const adminroutes = require('./routes/adminroutes')
app.use('/', adminroutes)

const authroutes = require('./routes/authroutes')
app.use('/', authroutes)

const dashroutes = require('./routes/dashboardrotes')
app.use('/', dashroutes)

const profileroutes = require('./routes/profileroutes')
app.use('/', profileroutes)

const medicalPortal = require('./routes/medicalPortal')
app.use('/', medicalPortal)

const donorroutes = require('./routes/donorroutes')
app.use('/', donorroutes)

const recipientroutes = require('./routes/recipientRoutes')
app.use('/', recipientroutes)

const hospitaltauthroute = require('./routes/hospital/authdashboard')
app.use('/', hospitaltauthroute)

const hospitalProfileroute = require('./routes/hospital/profileRequestroutes')
app.use('/', hospitalProfileroute)

const hospitalOrganroute = require('./routes/hospital/organRequestroutes')
app.use('/', hospitalOrganroute)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).send("Internal Server Error");
});

// 404 Handler
app.use((req, res) => {
    res.status(404).send("Page not found");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
