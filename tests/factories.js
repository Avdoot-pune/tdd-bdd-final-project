const { faker } = require('@faker-js/faker');
const { Product, Category } = require('../src/models/product');

class ProductFactory {
  /** Build product attributes without writing to the database. */
  static build(overrides = {}) {
    const product = {
      // Included for compatibility with existing tests. Remove it before saving;
      // the database is responsible for assigning primary keys.
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.helpers.arrayElement([
        'Hat',
        'Pants',
        'Shirt',
        'Apple',
        'Banana',
        'Pots',
        'Towels',
        'Ford',
        'Chevy',
        'Hammer',
        'Wrench'
      ]),
      // Keep generated descriptions inside the model's 250-character limit.
      description: faker.lorem.sentence(),
      price: Number(faker.commerce.price({ min: 0.5, max: 2000, dec: 2 })),
      available: faker.datatype.boolean(),
      category: faker.helpers.arrayElement(Object.values(Category))
    };

    return { ...product, ...overrides };
  }

  static buildList(count, overrides = {}) {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /** Create one database record, allowing Sequelize to generate its id. */
  static async create(overrides = {}) {
    const productData = this.build(overrides);
    delete productData.id;
    return Product.create(productData);
  }

  /** Create multiple records with unique, database-generated ids. */
  static async createList(count, overrides = {}) {
    const products = this.buildList(count, overrides).map((product) => {
      const data = { ...product };
      delete data.id;
      return data;
    });
    return Product.bulkCreate(products);
  }
}

module.exports = { ProductFactory };
