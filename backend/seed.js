/**
 * DineSmart — MongoDB Atlas Seed Script
 * Run: node seed.js
 *
 * Seeds all 9 collections with realistic trial data.
 * Insertion order respects all cross-collection references.
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

// ─── Models ──────────────────────────────────────────────────────────────────
const Restaurant   = require('./models/Restaurant');
const User         = require('./models/User');
const Table        = require('./models/Table');
const MenuItem     = require('./models/MenuItem');
const Session      = require('./models/Session');
const Order        = require('./models/Order');
const OrderItem    = require('./models/OrderItem');
const RefreshToken = require('./models/RefreshToken');
const Analytics    = require('./models/Analytics');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const id       = () => new mongoose.Types.ObjectId();
const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n) => new Date(Date.now() + n * 86_400_000);

// ─── Pre-assign IDs so references are consistent ─────────────────────────────
const restaurantId = id();

const userId = {
  superadmin : id(),
  admin      : id(),
  kitchen1   : id(),
  waiter1    : id(),
};

const tableId = {
  t1 : id(),
  t2 : id(),
  t3 : id(),
  t4 : id(),
  t5 : id(),
};

const menuItemId = {
  burger      : id(),
  pasta       : id(),
  pizza       : id(),
  salad       : id(),
  lemonade    : id(),
  coffee      : id(),
  cheesecake  : id(),
  garlicBread : id(),
};

const sessionId = {
  s1 : id(),
  s2 : id(),
  s3 : id(),
};

const orderId = {
  o1 : id(),
  o2 : id(),
  o3 : id(),
};

const orderItemId = {
  oi1 : id(),
  oi2 : id(),
  oi3 : id(),
  oi4 : id(),
  oi5 : id(),
  oi6 : id(),
};

// ─── 1. RESTAURANT ───────────────────────────────────────────────────────────
const restaurantData = {
  _id           : restaurantId,
  name          : 'The Gourmet Bistro',
  slug          : 'gourmet-bistro',
  logoUrl       : 'https://example.com/logo/gourmet-bistro.png',
  contactNumber : '+14155552671',
  address : {
    street  : '142 Harbor View Drive',
    city    : 'San Francisco',
    state   : 'CA',
    zipCode : '94105',
    country : 'USA',
  },
  settings : {
    currency          : 'INR',
    taxRate           : 0.085,
    serviceChargeRate : 0.10,
    isOnline          : true,
  },
};

// ─── 2. USERS (plain passwords — bcrypt pre-save hook will hash them) ─────────
const usersData = [
  {
    _id          : userId.superadmin,
    restaurantId : restaurantId,
    name         : 'Alice Morgan',
    email        : 'alice.morgan@gourmetbistro.com',
    passwordHash : 'SuperAdmin@123',
    role         : 'superadmin',
    isActive     : true,
  },
  {
    _id          : userId.admin,
    restaurantId : restaurantId,
    name         : 'Bob Chen',
    email        : 'bob.chen@gourmetbistro.com',
    passwordHash : 'Admin@123456',
    role         : 'admin',
    isActive     : true,
  },
  {
    _id          : userId.kitchen1,
    restaurantId : restaurantId,
    name         : 'Carlos Rivera',
    email        : 'carlos.r@gourmetbistro.com',
    passwordHash : 'Kitchen@1234',
    role         : 'kitchen',
    isActive     : true,
  },
  {
    _id          : userId.waiter1,
    restaurantId : restaurantId,
    name         : 'Ethan Brooks',
    email        : 'ethan.b@gourmetbistro.com',
    passwordHash : 'Waiter@1234',
    role         : 'waiter',
    isActive     : true,
  },
];

// ─── 3. TABLES ───────────────────────────────────────────────────────────────
const tablesData = [
  { _id: tableId.t1, restaurantId, tableNumber: 'T-01', seatingCapacity: 2,  qrCodeDataUrl: '', status: 'occupied', currentSessionId: sessionId.s1 },
  { _id: tableId.t2, restaurantId, tableNumber: 'T-02', seatingCapacity: 4,  qrCodeDataUrl: '', status: 'occupied', currentSessionId: sessionId.s2 },
  { _id: tableId.t3, restaurantId, tableNumber: 'T-03', seatingCapacity: 4,  qrCodeDataUrl: '', status: 'vacant',   currentSessionId: null },
  { _id: tableId.t4, restaurantId, tableNumber: 'T-04', seatingCapacity: 6,  qrCodeDataUrl: '', status: 'cleaning', currentSessionId: null },
  { _id: tableId.t5, restaurantId, tableNumber: 'T-05', seatingCapacity: 8,  qrCodeDataUrl: '', status: 'occupied', currentSessionId: sessionId.s3 },
];

// ─── 4. MENU ITEMS ───────────────────────────────────────────────────────────
const menuItemsData = [
  {
    _id: menuItemId.burger, restaurantId, category: 'Mains',
    name: 'Classic Wagyu Burger',
    description: 'Juicy wagyu beef patty with aged cheddar, lettuce, tomato, and house aioli on a brioche bun.',
    price: 18.99, imageUrl: '', tags: ['chef-special', 'bestseller'],
    isAvailable: true, estimatedPreparationTime: 15, allergens: ['gluten', 'dairy', 'eggs'], calories: 720,
  },
  {
    _id: menuItemId.pasta, restaurantId, category: 'Mains',
    name: 'Truffle Mushroom Pasta',
    description: 'Creamy fettuccine with wild mushrooms, truffle oil, parmesan, and fresh herbs.',
    price: 16.50, imageUrl: '', tags: ['vegetarian', 'chef-special'],
    isAvailable: true, estimatedPreparationTime: 20, allergens: ['gluten', 'dairy', 'eggs'], calories: 640,
  },
  {
    _id: menuItemId.pizza, restaurantId, category: 'Mains',
    name: 'Margherita Wood-Fired Pizza',
    description: 'San Marzano tomato base, fresh mozzarella, basil, and extra virgin olive oil.',
    price: 14.99, imageUrl: '', tags: ['vegetarian'],
    isAvailable: true, estimatedPreparationTime: 18, allergens: ['gluten', 'dairy'], calories: 560,
  },
  {
    _id: menuItemId.salad, restaurantId, category: 'Starters',
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, and house-made caesar dressing.',
    price: 10.50, imageUrl: '', tags: ['healthy'],
    isAvailable: true, estimatedPreparationTime: 8, allergens: ['gluten', 'dairy', 'eggs', 'fish'], calories: 310,
  },
  {
    _id: menuItemId.lemonade, restaurantId, category: 'Beverages',
    name: 'Craft Lemonade',
    description: 'Freshly squeezed lemonade with mint and a hint of ginger.',
    price: 4.50, imageUrl: '', tags: ['vegan', 'cold'],
    isAvailable: true, estimatedPreparationTime: 3, allergens: [], calories: 110,
  },
  {
    _id: menuItemId.coffee, restaurantId, category: 'Beverages',
    name: 'Single Origin Espresso',
    description: 'Double shot of ethically sourced Colombian espresso.',
    price: 3.75, imageUrl: '', tags: ['hot', 'vegan'],
    isAvailable: true, estimatedPreparationTime: 4, allergens: [], calories: 10,
  },
  {
    _id: menuItemId.cheesecake, restaurantId, category: 'Desserts',
    name: 'New York Cheesecake',
    description: 'Creamy classic cheesecake on a graham cracker crust with berry compote.',
    price: 8.99, imageUrl: '', tags: ['dessert'],
    isAvailable: true, estimatedPreparationTime: 5, allergens: ['gluten', 'dairy', 'eggs'], calories: 450,
  },
  {
    _id: menuItemId.garlicBread, restaurantId, category: 'Starters',
    name: 'Garlic Herb Bread',
    description: 'Toasted sourdough with roasted garlic butter and fresh herbs.',
    price: 6.00, imageUrl: '', tags: ['vegetarian'],
    isAvailable: false, estimatedPreparationTime: 6, allergens: ['gluten', 'dairy'], calories: 280,
  },
];

// ─── 5. SESSIONS ─────────────────────────────────────────────────────────────
const sessionsData = [
  { _id: sessionId.s1, restaurantId, tableId: tableId.t1, joinedAt: daysAgo(0), expiresAt: daysAhead(0.1),  isActive: true, customerNickname: 'Alex'   },
  { _id: sessionId.s2, restaurantId, tableId: tableId.t2, joinedAt: daysAgo(0), expiresAt: daysAhead(0.08), isActive: true, customerNickname: 'Jordan' },
  { _id: sessionId.s3, restaurantId, tableId: tableId.t5, joinedAt: daysAgo(0), expiresAt: daysAhead(0.15), isActive: true, customerNickname: 'Taylor' },
];

// ─── 6. ORDERS ───────────────────────────────────────────────────────────────
const ordersData = [
  {
    _id: orderId.o1, restaurantId, tableId: tableId.t1,
    orderItems: [orderItemId.oi1, orderItemId.oi2],
    subtotal: 23.49, taxAmount: 1.99, serviceCharge: 2.35, totalAmount: 27.83,
    orderStatus: 'served', paymentStatus: 'unpaid', paymentMethod: 'card',
  },
  {
    _id: orderId.o2, restaurantId, tableId: tableId.t2,
    orderItems: [orderItemId.oi3, orderItemId.oi4],
    subtotal: 32.99, taxAmount: 2.80, serviceCharge: 3.30, totalAmount: 39.09,
    orderStatus: 'processing', paymentStatus: 'unpaid', paymentMethod: 'cash',
  },
  {
    _id: orderId.o3, restaurantId, tableId: tableId.t5,
    orderItems: [orderItemId.oi5, orderItemId.oi6],
    subtotal: 27.48, taxAmount: 2.34, serviceCharge: 2.75, totalAmount: 32.57,
    orderStatus: 'completed', paymentStatus: 'paid', paymentMethod: 'googlepay',
  },
];

// ─── 7. ORDER ITEMS ──────────────────────────────────────────────────────────
const orderItemsData = [
  { _id: orderItemId.oi1, restaurantId, orderId: orderId.o1, menuItemId: menuItemId.burger,    name: 'Classic Wagyu Burger',        price: 18.99, quantity: 1, customizationNotes: 'No onions please', status: 'completed' },
  { _id: orderItemId.oi2, restaurantId, orderId: orderId.o1, menuItemId: menuItemId.lemonade,  name: 'Craft Lemonade',              price: 4.50,  quantity: 1, customizationNotes: '',                  status: 'completed' },
  { _id: orderItemId.oi3, restaurantId, orderId: orderId.o2, menuItemId: menuItemId.pizza,     name: 'Margherita Wood-Fired Pizza', price: 14.99, quantity: 1, customizationNotes: 'Extra cheese',      status: 'preparing' },
  { _id: orderItemId.oi4, restaurantId, orderId: orderId.o2, menuItemId: menuItemId.pasta,     name: 'Truffle Mushroom Pasta',      price: 16.50, quantity: 1, customizationNotes: '',                  status: 'pending'   },
  { _id: orderItemId.oi5, restaurantId, orderId: orderId.o3, menuItemId: menuItemId.salad,     name: 'Caesar Salad',                price: 10.50, quantity: 2, customizationNotes: 'Dressing on side',  status: 'completed' },
  { _id: orderItemId.oi6, restaurantId, orderId: orderId.o3, menuItemId: menuItemId.cheesecake,name: 'New York Cheesecake',         price: 8.99,  quantity: 1, customizationNotes: '',                  status: 'completed' },
];

// ─── 8. REFRESH TOKENS ───────────────────────────────────────────────────────
const refreshTokensData = [
  {
    token: 'rt_alice_abc123def456ghi789jkl012mno345pqr678stu901vwx',
    userId: userId.superadmin, sessionId: null, restaurantId,
    role: 'superadmin', expiresAt: daysAhead(7),
    isRevoked: false, replacedByToken: null,
    ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  },
  {
    token: 'rt_bob_xyz789abc123def456ghi012jkl345mno678pqr901stu234',
    userId: userId.admin, sessionId: null, restaurantId,
    role: 'admin', expiresAt: daysAhead(7),
    isRevoked: false, replacedByToken: null,
    ipAddress: '192.168.1.11', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
  {
    token: 'rt_customer_alex_lmn456opq789rst012uvw345xyz678abc901def234',
    userId: null, sessionId: sessionId.s1, restaurantId,
    role: 'customer', expiresAt: daysAhead(0.1),
    isRevoked: false, replacedByToken: null,
    ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
  },
];

// ─── 9. ANALYTICS ────────────────────────────────────────────────────────────
const analyticsData = [
  {
    restaurantId, date: daysAgo(2),
    metrics: {
      totalRevenue: 1248.75, totalOrders: 42, averageOrderValue: 29.73,
      popularItems: [
        { menuItemId: menuItemId.burger,    name: 'Classic Wagyu Burger',        quantity: 18, revenue: 341.82 },
        { menuItemId: menuItemId.pizza,     name: 'Margherita Wood-Fired Pizza', quantity: 14, revenue: 209.86 },
        { menuItemId: menuItemId.pasta,     name: 'Truffle Mushroom Pasta',      quantity: 10, revenue: 165.00 },
      ],
    },
  },
  {
    restaurantId, date: daysAgo(1),
    metrics: {
      totalRevenue: 1574.20, totalOrders: 55, averageOrderValue: 28.62,
      popularItems: [
        { menuItemId: menuItemId.burger,     name: 'Classic Wagyu Burger',     quantity: 22, revenue: 417.78 },
        { menuItemId: menuItemId.cheesecake, name: 'New York Cheesecake',      quantity: 20, revenue: 179.80 },
        { menuItemId: menuItemId.coffee,     name: 'Single Origin Espresso',   quantity: 30, revenue: 112.50 },
      ],
    },
  },
  {
    restaurantId, date: daysAgo(0),
    metrics: {
      totalRevenue: 327.49, totalOrders: 12, averageOrderValue: 27.29,
      popularItems: [
        { menuItemId: menuItemId.pizza,  name: 'Margherita Wood-Fired Pizza', quantity: 5, revenue: 74.95 },
        { menuItemId: menuItemId.salad,  name: 'Caesar Salad',                quantity: 6, revenue: 63.00 },
        { menuItemId: menuItemId.burger, name: 'Classic Wagyu Burger',        quantity: 4, revenue: 75.96 },
      ],
    },
  },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected.\n');

    console.log('🗑️  Clearing existing collections...');
    await Promise.all([
      Restaurant.deleteMany({}),
      User.deleteMany({}),
      Table.deleteMany({}),
      MenuItem.deleteMany({}),
      Session.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({}),
      RefreshToken.deleteMany({}),
      Analytics.deleteMany({}),
    ]);
    console.log('✅ All collections cleared.\n');

    console.log('🌱 Seeding Restaurant...');
    await Restaurant.create(restaurantData);
    console.log('   ✅ 1 restaurant inserted.');

    console.log('🌱 Seeding Users (bcrypt hashing passwords)...');
    for (const u of usersData) {
      await User.create(u);
    }
    console.log(`   ✅ ${usersData.length} users inserted.`);

    console.log('🌱 Seeding Tables...');
    await Table.insertMany(tablesData);
    console.log(`   ✅ ${tablesData.length} tables inserted.`);

    console.log('🌱 Seeding Menu Items...');
    await MenuItem.insertMany(menuItemsData);
    console.log(`   ✅ ${menuItemsData.length} menu items inserted.`);

    console.log('🌱 Seeding Sessions...');
    await Session.insertMany(sessionsData);
    console.log(`   ✅ ${sessionsData.length} sessions inserted.`);

    console.log('🌱 Seeding Orders...');
    await Order.insertMany(ordersData);
    console.log(`   ✅ ${ordersData.length} orders inserted.`);

    console.log('🌱 Seeding Order Items...');
    await OrderItem.insertMany(orderItemsData);
    console.log(`   ✅ ${orderItemsData.length} order items inserted.`);

    console.log('🌱 Seeding Refresh Tokens...');
    await RefreshToken.insertMany(refreshTokensData);
    console.log(`   ✅ ${refreshTokensData.length} refresh tokens inserted.`);

    console.log('🌱 Seeding Analytics...');
    await Analytics.insertMany(analyticsData);
    console.log(`   ✅ ${analyticsData.length} analytics records inserted.`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('─'.repeat(60));
    console.log('📋 Staff Login Credentials:');
    console.log('─'.repeat(60));
    const creds = [
      { role: 'superadmin', email: 'alice.morgan@gourmetbistro.com', password: 'SuperAdmin@123' },
      { role: 'admin',      email: 'bob.chen@gourmetbistro.com',     password: 'Admin@123456'  },
      { role: 'kitchen',    email: 'carlos.r@gourmetbistro.com',     password: 'Kitchen@1234'  },
      { role: 'waiter',     email: 'ethan.b@gourmetbistro.com',      password: 'Waiter@1234'   },
    ];
    creds.forEach(c => {
      console.log(`  [${c.role.padEnd(12)}]  ${c.email.padEnd(42)}  ${c.password}`);
    });
    console.log('─'.repeat(60));

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err.errors) console.error(err.errors);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB Atlas.');
  }
}

seed();
