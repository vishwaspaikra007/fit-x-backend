const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()

const createOrder = require('./routes/createOrder')
const paymentFailed = require('./routes/paymentFailed')
const paymentCaptured = require('./routes/paymentCaptured')
const admin_auth = require('./admin/auth')
app.use(cors(
    {origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3001','http://localhost:3000', 'https://vishwaspaikra007.github.io', 'https://fitx-c9b1d.firebaseapp.com'],
     credentials: true}
     ))
app.options('*', cors())  // enable pre-flight request for complex cors request for every route
app.use(express.json())
app.use(express.urlencoded({
    extended: true
  }))

app.use(createOrder)  
app.use(paymentFailed)
app.use(paymentCaptured)
app.use(admin_auth)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log("app is listening on PORT : ", PORT)
})