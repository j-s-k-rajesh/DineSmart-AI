const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MenuItem = require('./models/MenuItem');
const Restaurant = require('./models/Restaurant');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart';

const southIndianMenu = [
  {
    category: 'Breakfast',
    name: 'Masala Dosa',
    description: 'Thin rice crepe filled with spiced potato curry, served with coconut chutney and sambar.',
    price: 120.00,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=800',
    tags: ['vegetarian', 'bestseller'],
    isAvailable: true,
    estimatedPreparationTime: 10,
    allergens: ['dairy'],
    calories: 350
  },
  {
    category: 'Breakfast',
    name: 'Idli Sambar',
    description: 'Steamed rice and lentil cakes served with flavorful lentil stew and chutneys.',
    price: 80.00,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=800',
    tags: ['vegetarian', 'healthy', 'vegan-optional'],
    isAvailable: true,
    estimatedPreparationTime: 5,
    allergens: [],
    calories: 200
  },
  {
    category: 'Breakfast',
    name: 'Medu Vada',
    description: 'Crispy deep-fried lentil donuts served with coconut chutney and sambar.',
    price: 70.00,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=800',
    tags: ['vegetarian', 'fried'],
    isAvailable: true,
    estimatedPreparationTime: 8,
    allergens: [],
    calories: 400
  },
  {
    category: 'Mains',
    name: 'Bisi Bele Bath',
    description: 'A traditional spicy and hearty dish of rice, lentils, and mixed vegetables.',
    price: 140.00,
    imageUrl: '',
    tags: ['vegetarian', 'spicy'],
    isAvailable: true,
    estimatedPreparationTime: 15,
    allergens: ['nuts', 'dairy'],
    calories: 450
  },
  {
    category: 'Mains',
    name: 'Hyderabadi Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender chicken and authentic South Indian spices.',
    price: 250.00,
    imageUrl: '',
    tags: ['non-vegetarian', 'bestseller'],
    isAvailable: true,
    estimatedPreparationTime: 20,
    allergens: ['dairy', 'nuts'],
    calories: 700
  },
  {
    category: 'Mains',
    name: 'Vegetable Chettinad',
    description: 'Mixed vegetables simmered in a robust, spicy black pepper and coconut gravy.',
    price: 180.00,
    imageUrl: '',
    tags: ['vegetarian', 'spicy'],
    isAvailable: true,
    estimatedPreparationTime: 15,
    allergens: ['nuts'],
    calories: 380
  },
  {
    category: 'Beverages',
    name: 'Filter Coffee',
    description: 'Authentic South Indian degree coffee brewed with chicory and frothed with hot milk.',
    price: 40.00,
    imageUrl: '',
    tags: ['vegetarian', 'hot'],
    isAvailable: true,
    estimatedPreparationTime: 3,
    allergens: ['dairy'],
    calories: 80
  },
  {
    category: 'Beverages',
    name: 'Sweet Lassi',
    description: 'Refreshing yogurt drink blended with sugar and a hint of cardamom.',
    price: 60.00,
    imageUrl: '',
    tags: ['vegetarian', 'cold'],
    isAvailable: true,
    estimatedPreparationTime: 2,
    allergens: ['dairy'],
    calories: 220
  },
  {
    category: 'Desserts',
    name: 'Kesari Bath',
    description: 'Sweet semolina pudding enriched with ghee, saffron, and roasted cashews.',
    price: 90.00,
    imageUrl: '',
    tags: ['vegetarian', 'sweet'],
    isAvailable: true,
    estimatedPreparationTime: 5,
    allergens: ['dairy', 'nuts', 'gluten'],
    calories: 320
  },
  {
    category: 'Desserts',
    name: 'Payasam',
    description: 'Traditional milk pudding made with vermicelli, flavored with cardamom and nuts.',
    price: 90.00,
    imageUrl: '',
    tags: ['vegetarian', 'sweet'],
    isAvailable: true,
    estimatedPreparationTime: 10,
    allergens: ['dairy', 'nuts', 'gluten'],
    calories: 280
  }
];

async function updateMenu() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const restaurant = await Restaurant.findOne();
    if (!restaurant) {
      console.log('No restaurant found! Run seed.js first.');
      process.exit(1);
    }

    restaurant.settings.currency = 'INR';
    await restaurant.save();
    console.log('Updated restaurant settings currency to INR.');

    console.log('Removing old menu items...');
    await MenuItem.deleteMany({ restaurantId: restaurant._id });
    console.log('Old menu items removed.');

    console.log('Inserting South Indian menu...');
    const newItems = southIndianMenu.map(item => ({
      ...item,
      restaurantId: restaurant._id
    }));

    await MenuItem.insertMany(newItems);
    console.log('South Indian menu successfully added!');

    process.exit(0);
  } catch (error) {
    console.error('Error updating menu:', error);
    process.exit(1);
  }
}

updateMenu();
