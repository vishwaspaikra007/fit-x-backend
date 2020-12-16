const express = require('express')
const router = express.Router()
const fb = require('../general/firebase')
const crypto = require('crypto')
const Razorpay = require('razorpay')


const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
})

router.post('/payment-captured', async (req, res) => {
    const secret = process.env.RAZOR_PAY_SIGNATURE_KEY
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
            const order_id = req.body.payload.payment.entity.order_id
            
            let orderDetails
            try {
                orderDetails = await razorpay.orders.fetch(order_id)
                console.log(orderDetails)
            } catch (error) {
                return
            }

            batch.update(fb.firestore.collection('orders').doc(order_id),
                { paymentCaptureDetails: req.body, status: "payment-captured" })

            batch.set(fb.firestore.collection('users').doc(orderDetails.notes.userId),
                { cartItems: fb._delete }, { merge: true })
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


module.exports = router