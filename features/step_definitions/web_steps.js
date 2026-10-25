const { When, Then, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { Builder, By, until, Select } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const assert = require('assert');

const BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';
const STEP_TIMEOUT_MS = 10000;

let driver;
setDefaultTimeout(60 * 1000);

BeforeAll(async function () {
  const options = new firefox.Options();
  options.addArguments('-headless');
  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();
});

AfterAll(async function () {
  if (driver) {
    await driver.quit();
  }
});

async function getField(fieldName) {
  const elementId = `product_${fieldName.toLowerCase().replace(/ /g, '_')}`;
  const field = await driver.wait(until.elementLocated(By.id(elementId)), STEP_TIMEOUT_MS);
  await driver.wait(until.elementIsVisible(field), STEP_TIMEOUT_MS);
  return field;
}

async function getButton(buttonText) {
  const buttonId = `${buttonText.toLowerCase()}-btn`;
  return driver.wait(until.elementLocated(By.id(buttonId)), STEP_TIMEOUT_MS);
}

When('I visit the {string}', async function (pageName) {
  // This assignment's UI scenarios all start at the Home Page.
  assert.ok(pageName, 'Page name must be supplied.');
  await driver.get(`${BASE_URL}/`);
});

Then('I should see {string} in the title', async function (expectedTitle) {
  await driver.wait(until.titleContains(expectedTitle), STEP_TIMEOUT_MS);
  const actualTitle = await driver.getTitle();
  assert.ok(actualTitle.includes(expectedTitle),
    `Expected title to include '${expectedTitle}', but got '${actualTitle}'.`);
});

Then('I should not see {string}', async function (text) {
  const pageSource = await driver.getPageSource();
  assert.ok(!pageSource.includes(text), `Expected not to see '${text}' on the page.`);
});

When('I set the {string} to {string}', async function (fieldName, value) {
  const field = await getField(fieldName);
  await field.clear();
  await field.sendKeys(value);
});

When('I select {string} in the {string} dropdown', async function (value, dropdownName) {
  const dropdown = await getField(dropdownName);
  await new Select(dropdown).selectByVisibleText(value);
});

When('I copy the {string} field', async function (fieldName) {
  const field = await getField(fieldName);
  this.copiedFieldValue = await field.getAttribute('value');
  assert.ok(this.copiedFieldValue,
    `Could not copy a value from field '${fieldName}'.`);
});

Then('the {string} field should be empty', async function (fieldName) {
  const field = await getField(fieldName);
  const value = await field.getAttribute('value');
  assert.strictEqual(value, '', `Expected field '${fieldName}' to be empty, but it was '${value}'.`);
});

When('I paste the {string} field', async function (fieldName) {
  assert.ok(this.copiedFieldValue, 'No field value has been copied to paste.');
  const field = await getField(fieldName);
  await field.clear();
  await field.sendKeys(this.copiedFieldValue);
});

Then('I should see {string} in the {string} field', async function (expectedValue, fieldName) {
  const field = await getField(fieldName);
  await driver.wait(async () => (await field.getAttribute('value')) === expectedValue,
    STEP_TIMEOUT_MS,
    `Expected '${expectedValue}' in field '${fieldName}'.`);
  const actualValue = await field.getAttribute('value');
  assert.strictEqual(actualValue, expectedValue);
});

Then('I should see {string} in the {string} dropdown', async function (expectedValue, dropdownName) {
  const dropdown = await getField(dropdownName);
  const select = new Select(dropdown);
  await driver.wait(async () => {
    const option = await select.getFirstSelectedOption();
    return (await option.getText()) === expectedValue;
  }, STEP_TIMEOUT_MS, `Expected '${expectedValue}' selected in '${dropdownName}' dropdown.`);
  const actualValue = await (await select.getFirstSelectedOption()).getText();
  assert.strictEqual(actualValue, expectedValue);
});

When('I change {string} to {string}', async function (fieldName, newValue) {
  const field = await getField(fieldName);
  await field.clear();
  await field.sendKeys(newValue);
});

When('I press the {string} button', async function (buttonText) {
  const button = await getButton(buttonText);
  await button.click();
  // The following message/results step performs its own explicit wait.
});

Then('I should see the message {string}', async function (expectedMessage) {
  const flash = await driver.wait(until.elementLocated(By.id('flash_message')), STEP_TIMEOUT_MS);
  await driver.wait(until.elementTextContains(flash, expectedMessage), STEP_TIMEOUT_MS,
    `Expected flash message to contain '${expectedMessage}'.`);
  const actualMessage = await flash.getText();
  assert.ok(actualMessage.includes(expectedMessage),
    `Expected flash message '${expectedMessage}', but got '${actualMessage}'.`);
});

Then('I should see {string} in the results', async function (text) {
  const results = await driver.wait(until.elementLocated(By.id('search_results')), STEP_TIMEOUT_MS);
  await driver.wait(async () => (await results.getText()).includes(text), STEP_TIMEOUT_MS,
    `Expected to see '${text}' in the search results.`);
});

Then('I should not see {string} in the results', async function (text) {
  const results = await driver.wait(until.elementLocated(By.id('search_results')), STEP_TIMEOUT_MS);
  const resultsText = await results.getText();
  assert.ok(!resultsText.includes(text),
    `Expected not to see '${text}' in the search results, but found it.`);
});
