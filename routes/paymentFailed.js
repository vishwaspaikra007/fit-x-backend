const express = require('express')
const router = express.Router()

router.post('/payment-failed', (req, res) => {
    console.log(req.body)
})

module.exports = router