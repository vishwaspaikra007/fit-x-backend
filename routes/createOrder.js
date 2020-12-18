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
    const amt = req.body.amount * 100
    const options = {
        amount: amt,
        currency: "INR",
        receipt: uuidv4(),
        payment_capture: 1,
        notes: {
            userId: req.body.userInfo.uid,
        },
        "transfers": [
            {
                "account": "acc_GDIzLgOfWbGWDY",//Please replace with appropriate ID.
                "amount": amt*0.5,
                "currency": "INR",
                "notes": {
                    "branch": "Acme Corp Bangalore North",
                    "name": "Gaurav Kumar"
                },
                "linked_account_notes": [
                    "branch"
                ],
                "on_hold": 0,
                // "on_hold_until": null
            },
            {
                "account": "acc_GC1EQ36h7iygtM",//Please replace with appropriate ID.
                "amount": amt*0.5,
                "currency": "INR",
                "notes": {
                    "branch": "Acme Corp Bangalore South",
                    "name": "Saurav Kumar"
                },
                "linked_account_notes": [
                    "branch"
                ],
                "on_hold": 0,
                // "on_hold_until": null
            }
        ]
    }
    try {
        const response = await razorpay.orders.create(options)
        const batch = fb.firestore.batch()
        batch.set(fb.firestore.collection('orders').doc(response.id),
            {
                ...req.body,
                amount: req.body.amount * 100,
                userId: req.body.userInfo.uid,
                vendorIds: Object.keys(req.body.cartItems).map(id => req.body.cartItems[id].vendorId),
                createdAt: fb.timestamp,
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