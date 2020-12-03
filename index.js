const express = require('express')
const Razorpay = require('razorpay')
const { v4: uuidv4 } = require('uuid')
const cors = require('cors')
const crypto = require('crypto')
require('dotenv').config()
const app = express()
const fb = require('./firebase')

app.use(cors(
    {origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3001','http://localhost:3000', 'https://vishwaspaikra007.github.io', 'https://fitx-c9b1d.firebaseapp.com'],
     credentials: true}
     ))
app.options('*', cors())  // enable pre-flight request for complex cors request for every route
app.use(express.json())
app.use(express.urlencoded({
    extended: true
  }))

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
})

app.post('/verifyPayment', async (req, res) => {
    const secret = "vishwas"
    let data = JSON.stringify(req.body)

    console.log(data)
    const shasum = crypto.createHmac('sha256', secret)
    shasum.update(data)
    const digest = shasum.digest('hex')


    console.log(req.headers['x-razorpay-signature'], digest)
    if (digest === req.headers['x-razorpay-signature']) {
        console.log("request is legit")
        try {
            const batch = fb.firestore.batch()
            batch.update(fb.firestore.collection('orders').doc(req.body.payload.payment.entity.order_id),
                { paymentCaptureDetails: req.body })
            // const cartItems = (await fb.firestore.collection('orders').doc(req.body.payload.payment.entity.order_id).get()).data().cartItems
            // cartItems.forEach(item => {
            //     console.log(item.vendorId)
            //     batch.set(
            //         fb.firestore.collection('vendors')
            //             .doc(item.vendorId)
            //                 .collection('orders')
            //                     .doc(req.body.payload.payment.entity.order_id), 
            //         {orders: fb.arrayUnion(item)})  
            // })

            // find a way to update vendors and users
            // probably with WHatsapp message
            await batch.commit()
            res.json({ status: "ok" })
        } catch (err) {
            console.log(err)
        }
    }
    console.log(req.body)
})


app.post('/razorpay', async (req, res) => {
    console.log("yu")
    const options = {
        amount: req.body.amount * 100,
        currency: "INR",
        receipt: uuidv4(),
        payment_capture: 1,
    }
    try {
        const response = await razorpay.orders.create(options)
        const batch = fb.firestore.batch()
        batch.set(fb.firestore.collection('orders').doc(response.id),
            {
                amount: req.body.amount * 100,
                userInfo: req.body.userInfo,
                cartItems: req.body.cartItems,
                userId: req.body.userInfo.uid,
                vendorIds: req.body.cartItems.map(item => item.vendorId)
            })
        // batch.update(fb.firestore.collection('users').doc(req.body.userInfo.uid), { orders: fb.arrayUnion(response.id) })
        await batch.commit()
        console.log(response)
        res.json({
            success: true,
            id: response.id,
            currency: response.currency,
            amount: response.amount,
        })
    } catch (err) {
        console.log(err)
        res.json({
            success: false,
            err: err
        })
    }
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log("app is listening on PORT : ", PORT)
})