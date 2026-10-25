const express = require('express');
const { Product, Category } = require('../models/product');
const { Op } = require('sequelize');
const { validateProduct, checkContentType } = require('../middleware/validation');

const router = express.Router();

function isValidId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function notFound(res, id) {
  return res.status(404).json({
    error: 'Not Found',
    message: `Product with id '${id}' was not found.`
  });
}

/** Health check used by the assignment and deployment scripts. */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 200, message: 'OK' });
});

/** Create a product. The existing validation middleware checks the full payload. */
router.post('/', checkContentType('application/json'), validateProduct, async (req, res) => {
  try {
    // Do not allow clients to choose the auto-incrementing primary key.
    const productData = { ...req.body };
    delete productData.id;

    const product = await Product.create(productData);
    return res
      .status(201)
      .location(`/api/products/${product.id}`)
      .json(product.serialize());
  } catch (error) {
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

/** Read one product. */
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return notFound(res, req.params.id);
  }

  try {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product) {
      return notFound(res, req.params.id);
    }
    return res.status(200).json(product.serialize());
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/** Update an existing product. The request must contain the complete product. */
router.put('/:id', checkContentType('application/json'), validateProduct, async (req, res) => {
  if (!isValidId(req.params.id)) {
    return notFound(res, req.params.id);
  }

  try {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product) {
      return notFound(res, req.params.id);
    }

    const productData = { ...req.body };
    delete productData.id;
    await product.update(productData);
    return res.status(200).json(product.serialize());
  } catch (error) {
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

/** Delete an existing product. DELETE is idempotent only for a known resource here. */
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return notFound(res, req.params.id);
  }

  try {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product) {
      return notFound(res, req.params.id);
    }

    await product.destroy();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * List products, optionally filtered by a case-insensitive partial name,
 * category, and/or availability. Invalid categories return an empty list,
 * which matches the supplied assignment's search behavior.
 */
router.get('/', async (req, res) => {
  try {
    const where = {};
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    const category = typeof req.query.category === 'string'
      ? req.query.category.trim().toUpperCase()
      : '';
    const rawAvailability = req.query.availability !== undefined
      ? req.query.availability
      : req.query.available;

    if (name) {
      // Op.iLike is supported by the PostgreSQL database used by the lab.
      where.name = { [Op.iLike]: `%${name}%` };
    }

    if (category) {
      if (!Object.values(Category).includes(category)) {
        return res.status(200).json([]);
      }
      where.category = category;
    }

    if (rawAvailability !== undefined && rawAvailability !== '') {
      const availability = String(rawAvailability).toLowerCase();
      if (availability !== 'true' && availability !== 'false') {
        return res.status(400).json({
          error: 'Bad Request',
          message: "Availability must be 'true' or 'false'."
        });
      }
      where.available = availability === 'true';
    }

    const products = await Product.findAll({ where });
    return res.status(200).json(products.map((product) => product.serialize()));
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;
