const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()

const createOrder = require('./routes/createOrder')
const paymentFailed = require('./routes/paymentFailed')
const paymentCaptured = require('./routes/paymentCaptured')
const deleteProduct = require('./routes/deleteProduct')
const deleteVendor = require('./routes/deleteVendor')
const admin_auth = require('./admin/auth')
app.use(cors(
    {origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3001','http://localhost:3000', 'https://vishwaspaikra007.github.io', 'https://fitx-c9b1d.firebaseapp.com', 'https://fitx-c9b1d.web.app'],
     credentials: true}
     ))
app.options('*', cors())  // enable pre-flight request for complex cors request for every routehttps://fitx-c9b1d.web.app/
app.use(express.json())
app.use(express.urlencoded({
    extended: true
  }))

app.use(createOrder)  
app.use(paymentFailed)
app.use(paymentCaptured)
app.use(deleteProduct)
app.use(deleteVendor)
app.use(admin_auth)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log("app is listening on PORT : ", PORT)
})