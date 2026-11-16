const { env } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { isValidKietEmail, extractCollegeId } = require('../utils/validators');

async function seedAdmin() {
  const emailArg = process.argv[2];

  if (!emailArg || !isValidKietEmail(emailArg)) {
    console.error('Usage: npm run seed:admin <valid-kiet-email>');
    console.error('Example: npm run seed:admin harshit@kiet.edu');
    process.exit(1);
  }

  const normalizedEmail = emailArg.trim().toLowerCase();
  const collegeId = extractCollegeId(normalizedEmail);

  try {
    await connectDB(env.MONGO_URI);

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.role = 'admin';
      user.isSuspended = false;
      await user.save();
      console.log(`✅ [ADMIN SEED] Existing user ${normalizedEmail} successfully promoted to ADMIN.`);
    } else {
      user = await User.create({
        name: collegeId.toUpperCase(),
        email: normalizedEmail,
        collegeId,
        role: 'admin',
        isVerified: true,
      });
      console.log(`✅ [ADMIN SEED] New user ${normalizedEmail} created with ADMIN privileges.`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[ADMIN SEED ERROR]', err.message);
    process.exit(1);
  }
}

seedAdmin();
