import pdfParse from "pdf-parse";
import fs from "fs";

(async () => {
  const path = "./docs/job_description.pdf"; // ubah ke file lain kalau mau test
  try {
    const buf = fs.readFileSync(path);
    const data = await pdfParse(buf);
    console.log("✅ Parsed successfully");
    console.log(data.text.slice(0, 200)); // preview isi
  } catch (e) {
    console.error("❌ Failed to parse:", e.message);
  }
})();
