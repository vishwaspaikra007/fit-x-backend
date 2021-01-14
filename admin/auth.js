const express = require('express')
const router = express.Router()
const admin = require("./admin");

router.post('/auth', (req, res) => {

  console.log(req.body)
  admin
    .auth()
    .getUserByPhoneNumber(req.body.phoneNumber)
    .then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log(`Successfully fetched user data:`);
      // console.log(`Successfully fetched user data:  ${userRecord.toJSON()}`);
      res.send("user exist")
    })
    .catch((error) => {
      console.log('Error fetching user data:', error);
      res.send(null)
    });
})

module.exports = router