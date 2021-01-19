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
    let charges = {}
    let chargesToProductInfo = {}
    let chargesToServiceInfo
    let transfers
    try {
        let path
        if (req.body.type == 'service') {
            path = 'vendor service charge to vendors'
        } else {
            path = 'product charge to vendors'
        }
        charges = await fb.firestore.collection('web_config').doc('charges').get()
        charges = charges.data()[path] ? charges.data()[path] : {}
    } catch (err) {
        console.log(err)
    }
    if (req.body.type === 'service') {
        let shareAmt = parseFloat(req.body.service.price)
        let chargeAmt = 0
        const chargesCopy = {}
        Object.keys(charges).map(key => {
            if (charges[key].chargeType == 'fixed') {
                chargeAmt += parseFloat(charges[key].chargeValue)
                chargesCopy[key] = parseFloat(charges[key].chargeValue)
            } else if (charges[key].chargeType == 'percentage') {
                chargeAmt += parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
                chargesCopy[key] = parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
            } else if (charges[key].chargeType == 'percentage with max') {
                const tot = parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
                chargeAmt += parseFloat(Math.min(tot, charges[key].chargeValue))
                chargesCopy[key] = parseFloat(Math.min(tot, charges[key].chargeValue))
            }
        })
        chargesToServiceInfo = chargesCopy
        shareAmt = parseFloat(shareAmt - chargeAmt) * 100
        transfers = [{
            "account": req.body.bankAccountId,//Please replace with appropriate ID.
            "amount": parseInt(shareAmt),
            "currency": "INR",
            "notes": {
                "Vendor ID": req.body.vendorId,
                "Vendor Name": req.body.vendorName
            },
            "linked_account_notes": [
                "Vendor ID", "Vendor Name"
            ],
            "on_hold": 0,
        }]
    } else {
        transfers = Object.keys(req.body.cartItems).map(id => {
            const price = parseFloat(req.body.cartItems[id].price)
            const discount = parseFloat(req.body.cartItems[id].discount)
            const quantity = parseFloat(req.body.cartItems[id].quantity)
            let shareAmt
            if (discount)
                shareAmt = (price - (price * discount / 100)) * quantity
            else
                shareAmt = price * quantity
            let chargeAmt = 0
            const chargesCopy = {}
            Object.keys(charges).map(key => {
                if (charges[key].chargeType == 'fixed') {
                    chargeAmt += parseFloat(charges[key].chargeValue)
                    chargesCopy[key] = parseFloat(charges[key].chargeValue)
                } else if (charges[key].chargeType == 'percentage') {
                    chargeAmt += parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
                    chargesCopy[key] = parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
                } else if (charges[key].chargeType == 'percentage with max') {
                    const tot = parseFloat(shareAmt * (charges[key].chargePercentage) / 100)
                    chargeAmt += parseFloat(Math.min(tot, charges[key].chargeValue))
                    chargesCopy[key] = parseFloat(Math.min(tot, charges[key].chargeValue))
                }
            })
            chargesToProductInfo[id] = chargesCopy
            shareAmt = parseFloat(shareAmt - chargeAmt) * 100
            return {
                "account": req.body.cartItems[id].bankAccountId,//Please replace with appropriate ID.
                "amount": parseInt(shareAmt),
                "currency": "INR",
                "notes": {
                    "Vendor ID": req.body.cartItems[id].vendorId,
                    "Vendor Name": req.body.cartItems[id].vendorName
                },
                "linked_account_notes": [
                    "Vendor ID", "Vendor Name"
                ],
                "on_hold": 0,
            }
        })
    }
    const options = {
        amount: amt,
        currency: "INR",
        receipt: uuidv4(),
        payment_capture: 1,
        notes: {
            userId: req.body.type === 'service' ? req.body.userId : req.body.userInfo.uid,
            type: req.body.type,
            couponCode: req.body.coupon && req.body.coupon.couponCode,
            vendorId: req.body.type === 'service' ? req.body.vendorId : undefined
        },
        transfers: transfers
    }
    try {
        const response = await razorpay.orders.create(options)
        const batch = fb.firestore.batch()
        let ref = 'orders'
        let body
        if (req.body.type === 'service') {
            ref = 'services'
            body = {
                ...req.body,
                amount: req.body.amount * 100,
                createdAt: fb.timestamp,
                status: 'purchase initiated',
                ['charges to vendors']: charges,
                chargesToServiceInfo: chargesToServiceInfo,
            }
        } else {
            // let coupon = req.body.coupon
            // if(coupon) {
            //     await fb.firestore.collection('web_config').doc('coupons')
            //     .set({[coupon.couponCode]: { count: fb.incrementBy(-1)}}, {merge: true})
            // }
            body = {
                ...req.body,
                amount: req.body.amount * 100,
                userId: req.body.userInfo.uid,
                vendorIds: Object.keys(req.body.cartItems).map(id => req.body.cartItems[id].vendorId),
                createdAt: fb.timestamp,
                status: 'order created',
                ['charges to vendors']: charges,
                chargesToProductInfo: chargesToProductInfo,
            }
        }
        batch.set(fb.firestore.collection(ref).doc(response.id), body)
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