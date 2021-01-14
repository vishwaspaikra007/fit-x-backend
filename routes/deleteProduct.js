const express = require('express')
const router = express.Router()
const deleteProduct = require('../general/deleteProduct')

router.post('/delete-product', async (req, res) => {
    const { product, user } = req.body
    if (user && user.uid && product.vendorId) {
        try {
            const response = await deleteProduct(product)
            res.send(response)
        } catch (error) {
            console.log(error)
            res.send(error)    
        }
    } else {
        res.sendStatus(401).send()
    }
})

module.exports = router