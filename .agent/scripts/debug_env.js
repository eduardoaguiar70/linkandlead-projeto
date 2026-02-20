const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        console.log("--- .env Content Start ---");
        console.log(envContent);
        console.log("--- .env Content End ---");
    } else {
        console.error(".env file not found");
    }
} catch (e) {
    console.error("Error reading .env:", e);
}
