// Imports
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

// __dirname workaround for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DIR = path.join(__dirname, './faculty_html');
const CSV_PATH = path.join(__dirname, './UCSB Departments and Programs - Sheet1.csv');

// Extract domain from URL
function extractDomain(url) {
  url = String(url);
  const match = url.match(/^(https?:\/\/)?(www\.)?([^/]+)/);
  return match ? match[0] : null;
}

// Create filename from department name
function createFilename(department) {
  return department.replace(/ /g, '_').replace(/\//g, '_') + '.html';
}

// Main function
async function processDepartments() {
  try {
    const csvBuffer = await fs.readFile(CSV_PATH, 'utf8');
    const result = Papa.parse(csvBuffer, {
      header: true,
      skipEmptyLines: true,
    });

    const departments = {};

    for (const row of result.data) {
      const departmentName = row['Department/Unit'];
      const fullUrl = row['Faculty Listing Link'];
      const domain = extractDomain(fullUrl);

      if (!departments[departmentName]) {
        departments[departmentName] = {};
      }

      if (!departments[departmentName]['domain']) {
        departments[departmentName]['domain'] = domain;
      }

      if (!departments[departmentName]['url']) {
        departments[departmentName]['url'] = fullUrl;
      }

      if (!departments[departmentName]['filename']) {
        departments[departmentName]['filename'] = path.join(DIR, createFilename(departmentName));
      }
    }

    console.log(departments);
    // You can now use the `departments` object for scraping or saving HTML
  } catch (err) {
    console.error('Error processing CSV:', err);
  }
}

processDepartments();
