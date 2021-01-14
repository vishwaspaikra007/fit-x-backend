const admin = require('../admin/admin')

async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
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
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}


const deleteProduct = (product) => {
    return new Promise((resolve, reject) => {

        let imagesTobeDeleted = []
        if (product.imagesPath) {
            product.imagesPath.map(path => {
                imagesTobeDeleted.push(
                    admin.storage().bucket(`gs://fitx-c9b1d.appspot.com/`).deleteFiles({
                        prefix: path
                    })
                )
            })
        }
        Promise.all(imagesTobeDeleted).then(async result => {
            try {
                await deleteCollection(admin.firestore(), `products/${product.id}/reviews`, 500)
                console.log(`reviews deleted`)
            } catch (error) {
                console.log(`failed to delete product with id ${product.id}`, error)
                reject({ status: "failed", msg: "Something went wrong", err: error })
            }
            admin.firestore().collection('products').doc(product.id).delete()
                .then(result => {
                    console.log(`product ${product.id} successfully deleted`)
                    resolve({ status: "success", msg: "Image successfully deleted" })
                }).catch(err => {
                    console.log(`failed to delete product with id ${product.id}`, err)
                    reject({ status: "failed", msg: "Something went wrong", err: err })
                })
        }).catch(err => {
            console.log(err)
            reject({ status: "failed", msg: "Something went wrong", err: err })
        })

    })
}

module.exports = deleteProduct