const { Product, Category } = require('../../src/models/product');
const { sequelize } = require('../../src/database/connection');
const { ProductFactory } = require('../factories');

describe('Product Model', () => {
  beforeEach(async () => {
    await Product.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true
    });
  });

  describe('Product creation', () => {
    test('should construct a product before it is saved', () => {
      const product = new Product({
        name: 'Fedora',
        description: 'A red hat',
        price: 12.5,
        available: true,
        category: Category.CLOTHS
      });

      expect(product).toBeDefined();
      expect(product.id).toBeNull();
      expect(product.name).toBe('Fedora');
      expect(product.description).toBe('A red hat');
      expect(product.available).toBe(true);
      expect(Number(product.price)).toBe(12.5);
      expect(product.category).toBe(Category.CLOTHS);
    });

    test('should save a product to the database', async () => {
      expect(await Product.findAll()).toHaveLength(0);

      const productData = ProductFactory.build();
      delete productData.id;
      const savedProduct = await Product.create(productData);

      expect(savedProduct.id).toBeDefined();
      const products = await Product.findAll();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe(productData.name);
      expect(products[0].description).toBe(productData.description);
      expect(Number(products[0].price)).toBe(productData.price);
      expect(products[0].available).toBe(productData.available);
      expect(products[0].category).toBe(productData.category);
    });
  });
  
  //
  // ADD YOUR TEST CASES HERE
  //

  test('should read a saved product', async () => {
    const savedProduct = await ProductFactory.create();
    const foundProduct = await Product.findByPk(savedProduct.id);

    expect(foundProduct).not.toBeNull();
    expect(foundProduct.id).toBe(savedProduct.id);
    expect(foundProduct.name).toBe(savedProduct.name);
    expect(foundProduct.description).toBe(savedProduct.description);
    expect(Number(foundProduct.price)).toBe(Number(savedProduct.price));
    expect(foundProduct.available).toBe(savedProduct.available);
    expect(foundProduct.category).toBe(savedProduct.category);
  });

  test('should update a product without changing its id', async () => {
    const product = await ProductFactory.create();
    const originalId = product.id;

    await product.update({ description: 'Updated description' });
    const foundProduct = await Product.findByPk(originalId);

    expect(foundProduct.id).toBe(originalId);
    expect(foundProduct.description).toBe('Updated description');
  });

  test('should delete a product', async () => {
    const product = await ProductFactory.create();
    expect(await Product.count()).toBe(1);

    await product.destroy();

    expect(await Product.count()).toBe(0);
    expect(await Product.findByPk(product.id)).toBeNull();
  });

  test('should list every product', async () => {
    expect(await Product.findAll()).toHaveLength(0);
    await ProductFactory.createList(5);
    expect(await Product.findAll()).toHaveLength(5);
  });

  test('should find products by exact name', async () => {
    const products = await ProductFactory.createList(5);
    const targetName = products[0].name;
    const expectedCount = products.filter((product) => product.name === targetName).length;

    const found = await Product.findByName(targetName);
    expect(found).toHaveLength(expectedCount);
    found.forEach((product) => expect(product.name).toBe(targetName));
  });

  test('should find products by availability', async () => {
    const products = await ProductFactory.createList(10);
    const targetAvailability = products[0].available;
    const expectedCount = products.filter(
      (product) => product.available === targetAvailability
    ).length;

    const found = await Product.findByAvailability(targetAvailability);
    expect(found).toHaveLength(expectedCount);
    found.forEach((product) => expect(product.available).toBe(targetAvailability));
  });

  test('should find products by category', async () => {
    const products = await ProductFactory.createList(10);
    const targetCategory = products[0].category;
    const expectedCount = products.filter(
      (product) => product.category === targetCategory
    ).length;

    const found = await Product.findByCategory(targetCategory);
    expect(found).toHaveLength(expectedCount);
    found.forEach((product) => expect(product.category).toBe(targetCategory));
  });
});
