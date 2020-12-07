const express = require('express')
const router = express.Router()
const fb = require('../general/firebase')
const Razorpay = require('razorpay')
const { v4: uuidv4 } = require('uuid')

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
})

router.post('/create-order', async (req, res) => {
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
                vendorIds: req.body.cartItems.map(item => item.vendorId),
                status: 'order-created'
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

module.exports = router