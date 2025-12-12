import bcrypt from 'bcryptjs';

const newPassword = "snuggles"

const hashed = await bcrypt.hash(newPassword, 10);

console.log("Raw: ", newPassword);
console.log("Hashed: ", hashed);
console.log("Verify: ", await bcrypt.compare(newPassword, hashed));