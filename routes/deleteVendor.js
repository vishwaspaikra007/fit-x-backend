const express = require('express')
const router = express.Router()
const admin = require('../admin/admin')
const deleteProduct = require('../general/deleteProduct.js')

async function deleteDocs(db, collectionPath, batchSize, vendorId) {
    const collectionRef = db.collection(collectionPath).where('vendorId', '==', vendorId);
    const query = collectionRef.limit(batchSize);
  
    return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, resolve).catch(reject);
    });
  }
  
  async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }
  
    // Delete documents in a batch
    // const batch = db.batch();
    try {
        snapshot.docs.forEach(async (doc) => {
            await deleteProduct({...doc.data(), id: doc.id, imagesPath: undefined})
          //   batch.delete(doc.ref);
          });
    } catch (error) {
        console.log(error)
    }
    
    // await batch.commit();
  
    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
  }

router.post('/delete-vendor', (req, res) => {
    admin.firestore().collection('vendors').doc(req.body.adminId).get()
    .then(async doc => {
        if(doc.data().admin == true) {
            try {
                await admin.storage().bucket(`gs://fitx-c9b1d.appspot.com/`).deleteFiles({
                    prefix: 'productImages/' + req.body.vendorId
                })
                await deleteDocs(admin.firestore(), 'products', 500, req.body.vendorId)
                await admin.storage().bucket(`gs://fitx-c9b1d.appspot.com/`).deleteFiles({
                    prefix: 'vendorPage/' + req.body.vendorId
                })
                await admin.firestore().collection('vendors').doc(req.body.vendorId).delete()
                await admin.firestore().collection('users').doc(req.body.vendorId)
                    .update({isVendor: false})
                console.log('deletion process completed')
                res.send({status: 'success', msg: 'vendor successfully deleted from the database'})
            } catch (error) {
                res.send({status: 'failed', msg: 'Something went wrong try again'})
            }
        } else {
            res.send({status: 'failed', msg: 'You are not authorised to delete vendors'})
        }
    })
})

module.exports = router