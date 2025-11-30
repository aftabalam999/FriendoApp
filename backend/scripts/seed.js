const { db } = require('../src/config/firebase');
const bcrypt = require('bcrypt');

const seed = async () => {
  try {
    console.log('Seeding users...');
    
    const users = [
      { username: 'alice', displayName: 'Alice Wonderland' },
      { username: 'bob', displayName: 'Bob Builder' },
      { username: 'charlie', displayName: 'Charlie Chaplin' },
      { username: 'dave', displayName: 'Dave Developer' }
    ];

    for (const u of users) {
      const userRef = db.collection('users').doc(); // Auto-ID
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await userRef.set({
        uid: userRef.id,
        username: u.username,
        displayName: u.displayName,
        password: hashedPassword,
        photoURL: `https://ui-avatars.com/api/?name=${u.displayName}&background=random`,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isOnline: false
      });
      console.log(`Created user: ${u.username}`);
    }

    console.log('Seeding complete. Default password is "password123"');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
