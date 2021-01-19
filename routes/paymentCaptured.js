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
            let ref = 'orders'
            try {
                orderDetails = await razorpay.orders.fetch(order_id)
                if (orderDetails.notes.type === 'service')
                    ref = 'services'
                console.log(orderDetails)
            } catch (error) {
                return
            }

            if (orderDetails.notes.type === 'service') {
                batch.set(fb.firestore.collection('vendors').doc(orderDetails.notes.vendorId),
                    { serviceSales: fb.increment }, { merge: true })
            } else {
                let doc = await fb.firestore.collection(ref).doc(order_id).get()
                Object.keys(doc.data().cartItems).map(key => {

                    batch.set(fb.firestore.collection('products').doc(key),
                    { sales: fb.incrementBy(doc.data().cartItems[key].quantity) }, { merge: true })

                    batch.set(fb.firestore.collection('vendors').doc(doc.data().cartItems[key].vendorId),
                    { productSales: fb.incrementBy(doc.data().cartItems[key].quantity) }, { merge: true })
                })

                batch.set(fb.firestore.collection('users').doc(orderDetails.notes.userId),
                    { cartItems: fb._delete }, { merge: true })
            }

            batch.update(fb.firestore.collection(ref).doc(order_id),
                { paymentCaptureDetails: req.body, status: "payment captured" })

            if (orderDetails.notes.couponCode) {
                let couponCode = orderDetails.notes.couponCode
                batch.set(fb.firestore.collection('web_config').doc('coupons'),
                    { [couponCode]: { count: fb.incrementBy(-1) } }, { merge: true })
            }
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