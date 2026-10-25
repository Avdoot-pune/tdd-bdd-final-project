const request = require('supertest');
const app = require('../../src/app');
const { Product, Category } = require('../../src/models/product');
const { ProductFactory } = require('../factories');

const BASE_URL = '/api/products';

describe('Product Routes', () => {
  beforeEach(async () => {
    await Product.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true
    });
  });

  async function createProducts(count = 1) {
    return ProductFactory.createList(count);
  }

  describe('basic endpoints', () => {
    test('should serve the product catalog home page', async () => {
      const response = await request(app).get('/').expect(200);
      expect(response.text).toContain('Product Catalog Administration');
    });

    test('should return a healthy status', async () => {
      const response = await request(app).get(`${BASE_URL}/health`).expect(200);
      expect(response.body).toEqual({ status: 200, message: 'OK' });
    });
  });

  describe('POST /api/products', () => {
    test('should create a product and return its Location header', async () => {
      const payload = ProductFactory.build();
      const response = await request(app).post(BASE_URL).send(payload).expect(201);

      expect(response.headers.location).toBe(`/api/products/${response.body.id}`);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(payload.name);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.price).toBe(payload.price);
      expect(response.body.available).toBe(payload.available);
      expect(response.body.category).toBe(payload.category);
    });

    test('should reject a product without a name', async () => {
      const payload = ProductFactory.build();
      delete payload.name;

      const response = await request(app).post(BASE_URL).send(payload).expect(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject a missing Content-Type', async () => {
      await request(app).post(BASE_URL).send('bad data').expect(415);
    });

    test('should reject a non-JSON Content-Type', async () => {
      await request(app)
        .post(BASE_URL)
        .set('Content-Type', 'text/plain')
        .send('some plain text data')
        .expect(415);
    });

    test('should accept application/json with charset parameters', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(ProductFactory.build())
        .expect(201);
      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    test('should get one product by id', async () => {
      const [product] = await createProducts(1);
      const response = await request(app).get(`${BASE_URL}/${product.id}`).expect(200);
      expect(response.body).toEqual(product.serialize());
    });

    test('should return 404 for a product that does not exist', async () => {
      await request(app).get(`${BASE_URL}/99999`).expect(404);
    });

    test('should return 404 for a non-numeric id', async () => {
      await request(app).get(`${BASE_URL}/not-an-id`).expect(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    test('should update a product', async () => {
      const [product] = await createProducts(1);
      const payload = {
        name: 'Updated Name',
        description: 'Updated Description',
        price: 123.45,
        available: !product.available,
        category: product.category
      };

      const response = await request(app)
        .put(`${BASE_URL}/${product.id}`)
        .send(payload)
        .expect(200);

      expect(response.body.id).toBe(product.id);
      expect(response.body.name).toBe(payload.name);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.price).toBe(payload.price);
      expect(response.body.available).toBe(payload.available);
      expect(response.body.category).toBe(payload.category);
    });

    test('should return 404 when the product to update is missing', async () => {
      const payload = ProductFactory.build();
      delete payload.id;
      await request(app).put(`${BASE_URL}/99999`).send(payload).expect(404);
    });

    test('should return 400 when the update payload is invalid', async () => {
      const [product] = await createProducts(1);
      await request(app)
        .put(`${BASE_URL}/${product.id}`)
        .send({ name: '' })
        .expect(400);
    });

    test('should reject an update with a non-JSON Content-Type', async () => {
      await request(app)
        .put(`${BASE_URL}/1`)
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(415);
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('should delete a product', async () => {
      const [product] = await createProducts(1);
      await request(app).delete(`${BASE_URL}/${product.id}`).expect(204);
      await request(app).get(`${BASE_URL}/${product.id}`).expect(404);
    });

    test('should return 404 when deleting a missing product', async () => {
      await request(app).delete(`${BASE_URL}/99999`).expect(404);
    });
  });

  describe('GET /api/products', () => {
    test('should list all products', async () => {
      await createProducts(5);
      const response = await request(app).get(BASE_URL).expect(200);
      expect(response.body).toHaveLength(5);
    });

    test('should filter products by a partial name, case-insensitively', async () => {
      await createProducts(2);
      await ProductFactory.create({ name: 'My Special Laptop' });
      const response = await request(app)
        .get(`${BASE_URL}?name=${encodeURIComponent('special LAPTOP')}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Special Laptop');
    });

    test('should filter products by category', async () => {
      await ProductFactory.create({ category: Category.FOOD });
      await ProductFactory.create({ category: Category.TOOLS });
      const response = await request(app).get(`${BASE_URL}?category=TOOLS`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].category).toBe(Category.TOOLS);
    });

    test('should return an empty list for an invalid category', async () => {
      await createProducts(2);
      const response = await request(app).get(`${BASE_URL}?category=NOT_A_CATEGORY`).expect(200);
      expect(response.body).toEqual([]);
    });

    test('should filter products by availability', async () => {
      await ProductFactory.create({ available: true });
      await ProductFactory.create({ available: false });
      const response = await request(app).get(`${BASE_URL}?availability=true`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].available).toBe(true);
    });

    test('should support the available query-parameter alias', async () => {
      await ProductFactory.create({ available: true });
      await ProductFactory.create({ available: false });
      const response = await request(app).get(`${BASE_URL}?available=false`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].available).toBe(false);
    });

    test('should combine name, category, and availability filters', async () => {
      await ProductFactory.create({
        name: 'Special Hammer',
        category: Category.TOOLS,
        available: true
      });
      await ProductFactory.create({
        name: 'Special Hammer',
        category: Category.TOOLS,
        available: false
      });
      await ProductFactory.create({
        name: 'Special Hammer',
        category: Category.FOOD,
        available: true
      });

      const response = await request(app)
        .get(`${BASE_URL}?name=Special&category=TOOLS&availability=true`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Special Hammer');
      expect(response.body[0].category).toBe(Category.TOOLS);
      expect(response.body[0].available).toBe(true);
    });
  });
});
