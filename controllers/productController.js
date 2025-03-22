const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Product = require('../models/product');
const Category = require('../models/category');
const Variant = require('../models/variant');
const Inventory = require('../models/inventory');

/**
 * Get all products with filtering, sorting, and pagination
 * @route GET /api/products
 * @access Public
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      minPrice,
      maxPrice,
      tags,
      isActive,
      isFeatured,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    // Build where clause
    const where = {};
    
    if (name) {
      where.name = { [Op.like]: `%${name}%` };
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (minPrice) {
      where.basePrice = { ...where.basePrice, [Op.gte]: minPrice };
    }
    
    if (maxPrice) {
      where.basePrice = { ...where.basePrice, [Op.lte]: maxPrice };
    }
    
    if (tags) {
      where.tags = { [Op.like]: `%${tags}%` };
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    
    // Sort order validation
    const validSortFields = ['name', 'basePrice', 'createdAt', 'updatedAt'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Get products
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: Variant,
          attributes: ['id', 'sku', 'name', 'price']
        }
      ],
      order: [[orderBy, order]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 * @route GET /api/products/:id
 * @access Public
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'parentId']
        },
        {
          model: Variant,
          include: [
            {
              model: Inventory,
              attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
            }
          ]
        },
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 * @route POST /api/products
 * @access Private
 */
exports.createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      description,
      sku,
      basePrice,
      discountType,
      discountValue,
      categoryId,
      tags,
      imageUrls,
      attributes,
      isActive,
      isFeatured,
      inventory
    } = req.body;
    
    // Check if category exists
    const category = await Category.findByPk(categoryId, { transaction });
    
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          message: 'Category not found'
        }
      });
    }
    
    // Create product
    const product = await Product.create({
      name,
      description,
      sku,
      basePrice,
      discountType: discountType || 'none',
      discountValue: discountValue || 0,
      categoryId,
      tags,
      imageUrls,
      attributes,
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured !== undefined ? isFeatured : false
    }, { transaction });
    
    // Create inventory if provided
    if (inventory) {
      await Inventory.create({
        productId: product.id,
        sku: product.sku,
        quantity: inventory.quantity || 0,
        lowStockThreshold: inventory.lowStockThreshold || 10,
        reservedQuantity: inventory.reservedQuantity || 0,
        location: inventory.location
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Get the product with its relationships
    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdProduct
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update product
 * @route PUT /api/products/:id
 * @access Private
 */
exports.updateProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      description,
      sku,
      basePrice,
      discountType,
      discountValue,
      categoryId,
      tags,
      imageUrls,
      attributes,
      isActive,
      isFeatured,
      inventory
    } = req.body;
    
    const product = await Product.findByPk(req.params.id, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Check if category exists if provided
    if (categoryId && categoryId !== product.categoryId) {
      const category = await Category.findByPk(categoryId, { transaction });
      
      if (!category) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category not found'
          }
        });
      }
    }
    
    // Check if SKU is already in use
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({
        where: { sku },
        transaction
      });
      
      if (existingProduct) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            message: 'SKU is already in use'
          }
        });
      }
    }
    
    // Update product
    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      sku: sku || product.sku,
      basePrice: basePrice !== undefined ? basePrice : product.basePrice,
      discountType: discountType || product.discountType,
      discountValue: discountValue !== undefined ? discountValue : product.discountValue,
      categoryId: categoryId || product.categoryId,
      tags: tags !== undefined ? tags : product.tags,
      imageUrls: imageUrls !== undefined ? imageUrls : product.imageUrls,
      attributes: attributes !== undefined ? attributes : product.attributes,
      isActive: isActive !== undefined ? isActive : product.isActive,
      isFeatured: isFeatured !== undefined ? isFeatured : product.isFeatured
    }, { transaction });
    
    // Update inventory if provided
    if (inventory) {
      const existingInventory = await Inventory.findOne({
        where: { productId: product.id },
        transaction
      });
      
      if (existingInventory) {
        await existingInventory.update({
          sku: sku || product.sku,
          quantity: inventory.quantity !== undefined ? inventory.quantity : existingInventory.quantity,
          lowStockThreshold: inventory.lowStockThreshold !== undefined ? inventory.lowStockThreshold : existingInventory.lowStockThreshold,
          reservedQuantity: inventory.reservedQuantity !== undefined ? inventory.reservedQuantity : existingInventory.reservedQuantity,
          location: inventory.location !== undefined ? inventory.location : existingInventory.location,
          lastRestockDate: inventory.quantity > existingInventory.quantity ? new Date() : existingInventory.lastRestockDate
        }, { transaction });
      } else {
        await Inventory.create({
          productId: product.id,
          sku: product.sku,
          quantity: inventory.quantity || 0,
          lowStockThreshold: inventory.lowStockThreshold || 10,
          reservedQuantity: inventory.reservedQuantity || 0,
          location: inventory.location,
          lastRestockDate: inventory.quantity > 0 ? new Date() : null
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Get the updated product with its relationships
    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete product
 * @route DELETE /api/products/:id
 * @access Private
 */
exports.deleteProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const product = await Product.findByPk(req.params.id, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Delete product (will cascade to inventory and variants)
    await product.destroy({ transaction });
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Search products
 * @route GET /api/products/search
 * @access Public
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Query parameter is required'
        }
      });
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    
    // Search in name, description, and tags
    const where = {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
        { tags: { [Op.like]: `%${query}%` } },
        { sku: { [Op.like]: `%${query}%` } }
      ],
      isActive: true // Only search active products
    };
    
    // Get products
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product variants
 * @route GET /api/products/:id/variants
 * @access Public
 */
exports.getProductVariants = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    const variants = await Variant.findAll({
      where: { productId: req.params.id },
      include: [
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: variants.length,
      data: variants
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product variant
 * @route POST /api/products/:id/variants
 * @access Private
 */
exports.createProductVariant = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      sku,
      name,
      price,
      discountType,
      discountValue,
      options,
      imageUrls,
      isActive,
      inventory
    } = req.body;
    
    const product = await Product.findByPk(req.params.id, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Check if SKU is already in use
    const existingVariant = await Variant.findOne({
      where: { sku },
      transaction
    });
    
    if (existingVariant) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          message: 'SKU is already in use'
        }
      });
    }
    
    // Create variant
    const variant = await Variant.create({
      productId: product.id,
      sku,
      name: name || product.name,
      price: price || product.basePrice,
      discountType: discountType || 'none',
      discountValue: discountValue || 0,
      options,
      imageUrls,
      isActive: isActive !== undefined ? isActive : true
    }, { transaction });
    
    // Create inventory if provided
    if (inventory) {
      await Inventory.create({
        variantId: variant.id,
        sku: variant.sku,
        quantity: inventory.quantity || 0,
        lowStockThreshold: inventory.lowStockThreshold || 10,
        reservedQuantity: inventory.reservedQuantity || 0,
        location: inventory.location,
        lastRestockDate: inventory.quantity > 0 ? new Date() : null
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Get the variant with its relationships
    const createdVariant = await Variant.findByPk(variant.id, {
      include: [
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdVariant
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update product variant
 * @route PUT /api/products/:productId/variants/:id
 * @access Private
 */
exports.updateProductVariant = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      sku,
      name,
      price,
      discountType,
      discountValue,
      options,
      imageUrls,
      isActive,
      inventory
    } = req.body;
    
    // Verify product exists
    const product = await Product.findByPk(req.params.productId, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Verify variant exists and belongs to the product
    const variant = await Variant.findOne({
      where: {
        id: req.params.id,
        productId: req.params.productId
      },
      transaction
    });
    
    if (!variant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Variant not found'
        }
      });
    }
    
    // Check if SKU is already in use by another variant
    if (sku && sku !== variant.sku) {
      const existingVariant = await Variant.findOne({
        where: { 
          sku,
          id: { [Op.ne]: variant.id }
        },
        transaction
      });
      
      if (existingVariant) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            message: 'SKU is already in use'
          }
        });
      }
    }
    
    // Update variant
    await variant.update({
      sku: sku || variant.sku,
      name: name !== undefined ? name : variant.name,
      price: price !== undefined ? price : variant.price,
      discountType: discountType || variant.discountType,
      discountValue: discountValue !== undefined ? discountValue : variant.discountValue,
      options: options !== undefined ? options : variant.options,
      imageUrls: imageUrls !== undefined ? imageUrls : variant.imageUrls,
      isActive: isActive !== undefined ? isActive : variant.isActive
    }, { transaction });
    
    // Update inventory if provided
    if (inventory) {
      const existingInventory = await Inventory.findOne({
        where: { variantId: variant.id },
        transaction
      });
      
      if (existingInventory) {
        await existingInventory.update({
          sku: sku || variant.sku,
          quantity: inventory.quantity !== undefined ? inventory.quantity : existingInventory.quantity,
          lowStockThreshold: inventory.lowStockThreshold !== undefined ? inventory.lowStockThreshold : existingInventory.lowStockThreshold,
          reservedQuantity: inventory.reservedQuantity !== undefined ? inventory.reservedQuantity : existingInventory.reservedQuantity,
          location: inventory.location !== undefined ? inventory.location : existingInventory.location,
          lastRestockDate: inventory.quantity > existingInventory.quantity ? new Date() : existingInventory.lastRestockDate
        }, { transaction });
      } else {
        await Inventory.create({
          variantId: variant.id,
          sku: variant.sku,
          quantity: inventory.quantity || 0,
          lowStockThreshold: inventory.lowStockThreshold || 10,
          reservedQuantity: inventory.reservedQuantity || 0,
          location: inventory.location,
          lastRestockDate: inventory.quantity > 0 ? new Date() : null
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Get the updated variant with its relationships
    const updatedVariant = await Variant.findByPk(variant.id, {
      include: [
        {
          model: Inventory,
          attributes: ['quantity', 'lowStockThreshold', 'reservedQuantity']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: updatedVariant
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete product variant
 * @route DELETE /api/products/:productId/variants/:id
 * @access Private
 */
exports.deleteProductVariant = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Verify product exists
    const product = await Product.findByPk(req.params.productId, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Verify variant exists and belongs to the product
    const variant = await Variant.findOne({
      where: {
        id: req.params.id,
        productId: req.params.productId
      },
      transaction
    });
    
    if (!variant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Variant not found'
        }
      });
    }
    
    // Delete variant (will cascade to inventory)
    await variant.destroy({ transaction });
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};