# Navlens Report Generator

This tool runs locally on your admin machine to generate client PDFs.

## Setup
1. Open this folder in terminal:
   ```bash
   cd tools/report-generator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## How to Generate a Report
1. Open `generate.js`.
2. Update the `SITE_ID` variable at the top to the client's Site ID (you can find this in the Admin Portal under Reports).
3. Run the script:
   ```bash
   node generate.js
   ```
4. Find the PDF in the `output/` folder.

## Troubleshooting
- **Login Failed**: Update `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `generate.js` to match your local admin credentials.
- **Blank PDF**: Ensure your local dev server (`npm run dev`) is running at `localhost:3000`.
