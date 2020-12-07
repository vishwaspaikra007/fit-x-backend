const express = require('express')
const router = express.Router()
const fb = require('../general/firebase')
const crypto = require('crypto')

router.post('/payment-captured', async (req, res) => {
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
                { paymentCaptureDetails: req.body, status: "payment-captured" })

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