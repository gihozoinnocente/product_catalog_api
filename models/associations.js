/**
 * Set up model associations
 * This file prevents circular dependencies by setting up all associations
 * after models have been imported and defined
 */
const setupAssociations = () => {
    // Import all models
    const Product = require('./product');
    const Category = require('./category');
    const Variant = require('./variant');
    const Inventory = require('./inventory');
    const User = require('./user');
    
    // Category associations
    Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
    Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
    
    // Product-Category associations
    Product.belongsTo(Category, { foreignKey: 'categoryId' });
    Category.hasMany(Product, { foreignKey: 'categoryId' });
    
    // Product-User (seller) associations
    Product.belongsTo(User, { as: 'seller', foreignKey: 'userId' });
    User.hasMany(Product, { as: 'products', foreignKey: 'userId' });
    
    // Variant-Product associations
    Variant.belongsTo(Product, { foreignKey: 'productId', onDelete: 'CASCADE' });
    Product.hasMany(Variant, { foreignKey: 'productId', onDelete: 'CASCADE' });
    
    // Inventory associations
    Inventory.belongsTo(Product, { foreignKey: 'productId', onDelete: 'CASCADE' });
    Product.hasOne(Inventory, { foreignKey: 'productId', onDelete: 'CASCADE' });
    
    Inventory.belongsTo(Variant, { foreignKey: 'variantId', onDelete: 'CASCADE' });
    Variant.hasOne(Inventory, { foreignKey: 'variantId', onDelete: 'CASCADE' });
    
    console.log('All model associations have been set up');
  };
  
  module.exports = setupAssociations;