const { storage } = require('./src/config/firebase');

async function testStorage() {
    try {
        // admin.storage().bucket() returns a Bucket. 
        // To get the list of buckets, we need the Storage client.
        // Usually accessible via bucket.storage or admin.storage().app.options.credential... 
        // Actually admin.storage() returns the Storage service of firebase-admin, which wraps GCS.
        // Let's try to get the GCS client.
        
        const bucket = storage.bucket(); 
        // bucket.storage is the GCS Storage client instance
        const [buckets] = await bucket.storage.getBuckets();
        
        console.log('Available buckets:');
        buckets.forEach(b => console.log(`- ${b.name}`));
        
        if (buckets.length > 0) {
             const firstBucket = buckets[0];
             console.log(`\nRECOMMENDATION: Use this bucket: ${firstBucket.name}`);
             
             // Test access
             const [exists] = await firstBucket.exists();
             console.log(`Bucket '${firstBucket.name}' exists: ${exists}`);
        } else {
            console.log('No buckets found in this project. Please create one in Firebase Console.');
        }
    } catch (error) {
        console.error('Storage Test Failed:', error);
    }
}

testStorage();
