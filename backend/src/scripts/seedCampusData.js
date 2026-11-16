const { env } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');

const SEED_USERS = [
  {
    name: 'Harshit Agrahari',
    email: 'harshit.21b0101@kiet.edu',
    collegeId: '21B0101',
    role: 'student',
    isVerified: true,
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@kiet.edu',
    collegeId: '20B0234',
    role: 'student',
    isVerified: true,
  },
  {
    name: 'Priya Sharma',
    email: 'priya.22b0412@kiet.edu',
    collegeId: '22B0412',
    role: 'student',
    isVerified: true,
  },
  {
    name: 'KIET Campus Admin',
    email: 'admin@kiet.edu',
    collegeId: 'ADMIN01',
    role: 'admin',
    isVerified: true,
  },
];

const CAMPUS_ITEMS = [
  {
    title: 'Sony WH-1000XM4 Noise-Cancelling Headphones',
    description: 'Matte black over-ear headphones left on a wooden study cubicle near the second-floor quiet zone. Comes with the original zippered case.',
    category: 'Electronics',
    type: 'lost',
    locationName: 'Central Library · 2nd Floor Quiet Zone',
    address: 'Academic Block A, 2nd Floor',
    latitude: 28.7532,
    longitude: 77.4975,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Navy Canvas Roll-Top Backpack',
    description: 'Lost during Monday morning lectures. Contains a gray 14-inch laptop sleeve, water bottle in the side pocket, and a physics formula sheet.',
    category: 'Bags',
    type: 'lost',
    locationName: 'Engineering Block B · Lecture Hall 104',
    address: 'North Quadrangle, Near Lecture Hall Complex',
    latitude: 28.7538,
    longitude: 77.4981,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Brass House Keys with Red Mountain Lanyard',
    description: 'Found on a wooden picnic bench near the central cafeteria exit. Includes two brass keys, one bike lock key, and a red woven mountain carabiner.',
    category: 'Keys',
    type: 'found',
    locationName: 'Central Cafeteria & Student Center',
    address: 'Campus Ground Floor, Near Main Amphitheatre',
    latitude: 28.7528,
    longitude: 77.4969,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Casio Vintage Digital Watch - Silver',
    description: 'Found on the bleachers after evening basketball practice. Classic silver stainless steel link strap, stopwatch mode was running.',
    category: 'Accessories',
    type: 'found',
    locationName: 'Indoor Sports Complex & Gym',
    address: 'East Campus Sports Wing',
    latitude: 28.7521,
    longitude: 77.4989,
    imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Chemistry Lab Notebook & Student ID Card',
    description: 'Found on the second-floor laboratory counter. Hardbound spiral notebook labeled Organic Synthesis with student ID tucked inside.',
    category: 'Documents',
    type: 'found',
    locationName: 'Science Block · Chemistry Lab B',
    address: 'Department of Applied Sciences',
    latitude: 28.7534,
    longitude: 77.4971,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Mustard Yellow Ribbed Wool Beanie',
    description: 'Found draped over an outdoor wooden chair at the student cafe terrace during lunch hour. Thick knit, warm mustard tone, clean condition.',
    category: 'Clothing',
    type: 'found',
    locationName: 'Central Cafeteria Terrace',
    address: 'Campus Ground Floor, Near Main Amphitheatre',
    latitude: 28.7528,
    longitude: 77.4969,
    imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'TI-84 Plus CE Color Graphing Calculator',
    description: 'Lost following calculus exam in room 302. Black casing with a faint white star sticker on the protective slide cover.',
    category: 'Stationery',
    type: 'lost',
    locationName: 'Academic Block A · Room 302',
    address: '3rd Floor Academic Wing',
    latitude: 28.7532,
    longitude: 77.4975,
    imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Matte Olive Hydro Flask Water Bottle',
    description: '32oz wide-mouth insulated flask with national park stickers and a black flex cap. Found resting under the big tree on Central Lawn.',
    category: 'Other',
    type: 'found',
    locationName: 'Central Lawn & Amphitheatre',
    address: 'Main Campus Quadrangle',
    latitude: 28.7530,
    longitude: 77.4973,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'AirPods Pro with Saddle Brown Leather Case',
    description: 'Lost near the gym locker benches. Brown leather case with brass snap closure. Left earbud has small indentation.',
    category: 'Electronics',
    type: 'lost',
    locationName: 'Indoor Sports Complex & Gym',
    address: 'Locker Area B',
    latitude: 28.7521,
    longitude: 77.4989,
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=85',
    status: 'active',
  },
  {
    title: 'Navy Blue HP Laptop Charger (65W)',
    description: 'Left plugged into the wall outlet next to cubicle 14. 65W Blue-tip smart AC adapter with velcro tie.',
    category: 'Electronics',
    type: 'lost',
    locationName: 'Central Library · 1st Floor Digital Lounge',
    address: 'Academic Block A, 1st Floor',
    latitude: 28.7532,
    longitude: 77.4975,
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1200&q=85',
    status: 'resolved',
  },
];

async function seedCampusData() {
  try {
    await connectDB(env.MONGO_URI);
    console.log('Connected to MongoDB for campus data seeding...');

    // 1. Create or update users
    const userMap = {};
    for (const u of SEED_USERS) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
        console.log(`Created user: ${u.email} (${u.role})`);
      } else {
        existing.name = u.name;
        existing.role = u.role;
        existing.isSuspended = false;
        await existing.save();
        console.log(`Updated user: ${u.email} (${u.role})`);
      }
      userMap[u.email] = existing;
    }

    const primaryReporter = userMap['harshit.21b0101@kiet.edu'];
    const secondaryReporter = userMap['rahul.verma@kiet.edu'];

    // 2. Normalize existing items status (fix 'Active' -> 'active')
    const updateResult = await Item.updateMany(
      { status: 'Active' },
      { $set: { status: 'active' } }
    );
    if (updateResult.modifiedCount > 0) {
      console.log(`Normalized ${updateResult.modifiedCount} items with status 'Active' to 'active'.`);
    }

    // 3. Seed campus items if not already present
    for (let i = 0; i < CAMPUS_ITEMS.length; i++) {
      const itemDef = CAMPUS_ITEMS[i];
      const existing = await Item.findOne({ title: itemDef.title });
      const reporter = i % 2 === 0 ? primaryReporter : secondaryReporter;

      if (!existing) {
        await Item.create({
          type: itemDef.type,
          title: itemDef.title,
          description: itemDef.description,
          category: itemDef.category,
          images: [
            {
              url: itemDef.imageUrl,
              publicId: `seed-${i + 1}`,
            },
          ],
          location: {
            name: itemDef.locationName,
            address: itemDef.address,
            latitude: itemDef.latitude,
            longitude: itemDef.longitude,
            geo: {
              type: 'Point',
              coordinates: [itemDef.longitude, itemDef.latitude],
            },
          },
          reporterId: reporter._id,
          status: itemDef.status,
          date: new Date(Date.now() - i * 86400000),
          resolvedAt: itemDef.status === 'resolved' ? new Date() : null,
          resolvedBy: itemDef.status === 'resolved' ? reporter._id : null,
        });
        console.log(`Seeded item: "${itemDef.title}"`);
      }
    }

    console.log('✅ Campus data seeding complete!');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedCampusData();
