import fs from "fs-extra";
import path from "path";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config(); 

const { Client } = pg;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
});

// --- PATH CONFIG ---
const IMAGE_DIR = path.resolve("src/main/backend/images/faculty");
const PUBLIC_PATH_PREFIX = "/images/faculty";

async function downloadFacultyImages() {
  try {
    await db.connect();
    console.log("Connected ");

    await fs.ensureDir(IMAGE_DIR);

    const res = await db.query(`
      SELECT id, photo_url FROM faculty
      WHERE photo_url IS NOT NULL;
    `);

    console.log(`Found ${res.rows.length} faculty images.`);

    for (const row of res.rows) {
      const { id, photo_url } = row;
      const filePath = path.join(IMAGE_DIR, `${id}.jpg`);
      const publicPath = `${PUBLIC_PATH_PREFIX}/${id}.jpg`;

      try {
        const response = await axios.get(photo_url, {
          responseType: "arraybuffer",
          timeout: 10000,
        });

        // console.log(`Fetching URL for faculty ${id}: ${photo_url}`);
        // console.log(`Response status: ${response.status}`);
        // console.log(`Content-Type: ${response.headers["content-type"]}`);

        if (
          response.status === 200 &&
          response.headers["content-type"]?.includes("image")
        ) {
          await fs.writeFile(filePath, response.data);
          await db.query("UPDATE faculty SET image_path = $1 WHERE id = $2;", [
            publicPath,
            id,
          ]);
          console.log(`Saved faculty ${id} -> ${publicPath}`);
        } else {
          console.warn(`Skipped ${id}: invalid image type`);
        }
      } catch (err) {
        console.warn(`Failed for ${id}: ${err.message}`);
      }
    }

    console.log("All faculty images processed.");
  } catch (err) {
    console.error("Database or network error:", err);
  } finally {
    await db.end();
  }
}

downloadFacultyImages();
