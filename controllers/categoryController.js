const Category = require('../models/category');
const { sequelize } = require('../config/database');

/**
 * Get all categories
 * @route GET /api/categories
 * @access Public
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const { includeInactive, parentId } = req.query;
    
    const where = {};
    
    // Filter by active status
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    
    // Filter by parent category
    if (parentId) {
      where.parentId = parentId === 'null' ? null : parseInt(parentId, 10);
    }
    
    const categories = await Category.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID
 * @route GET /api/categories/:id
 * @access Public
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'children',
          where: { isActive: true },
          required: false
        }
      ]
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 * @route POST /api/categories
 * @access Private
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, imageUrl, isActive } = req.body;
    
    // Check if parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Parent category not found'
          }
        });
      }
    }
    
    const category = await Category.create({
      name,
      description,
      parentId: parentId || null,
      imageUrl,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * @route PUT /api/categories/:id
 * @access Private
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, imageUrl, isActive } = req.body;
    
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found'
        }
      });
    }
    
    // Check if parent category exists if parentId is provided
    if (parentId && parentId !== category.parentId) {
      // Prevent circular references
      if (parseInt(req.params.id, 10) === parseInt(parentId, 10)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category cannot be its own parent'
          }
        });
      }
      
      const parentCategory = await Category.findByPk(parentId);
      
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Parent category not found'
          }
        });
      }
    }
    
    // Update category
    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      parentId: parentId !== undefined ? (parentId || null) : category.parentId,
      imageUrl: imageUrl !== undefined ? imageUrl : category.imageUrl,
      isActive: isActive !== undefined ? isActive : category.isActive
    });
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * @route DELETE /api/categories/:id
 * @access Private
 */
exports.deleteCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const category = await Category.findByPk(req.params.id, { transaction });
    
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found'
        }
      });
    }
    
    // Check if category has subcategories
    const subcategories = await Category.findAll({
      where: { parentId: req.params.id },
      transaction
    });
    
    if (subcategories.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete category with subcategories'
        }
      });
    }
    
    // Delete category
    await category.destroy({ transaction });
    
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
 * Get category tree
 * @route GET /api/categories/tree
 * @access Public
 */
exports.getCategoryTree = async (req, res, next) => {
  try {
    // Get all root categories (parentId is null)
    const rootCategories = await Category.findAll({
      where: { 
        parentId: null,
        isActive: true 
      },
      order: [['name', 'ASC']]
    });
    
    // Function to recursively fetch child categories
    const getChildCategories = async (parentId) => {
      const children = await Category.findAll({
        where: { 
          parentId,
          isActive: true 
        },
        order: [['name', 'ASC']]
      });
      
      // Recursively get children for each child
      for (const child of children) {
        child.dataValues.children = await getChildCategories(child.id);
      }
      
      return children;
    };
    
    // Add children to each root category
    for (const rootCategory of rootCategories) {
      rootCategory.dataValues.children = await getChildCategories(rootCategory.id);
    }
    
    res.status(200).json({
      success: true,
      data: rootCategories
    });
  } catch (error) {
    next(error);
  }
};