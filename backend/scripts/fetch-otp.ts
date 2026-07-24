// Dev utility: fetch the most recent OTP code(s) from Cosmos, for testing
// registration/login flows locally without needing a real inbox.
//
// Usage:
//   npm run otp                  -> most recent OTP overall
//   npm run otp -- someone@x.com -> most recent OTP for that email
import "dotenv/config";
import { otpCodesContainer } from "../src/config/cosmos";

async function main() {
  const emailArg = process.argv[2];
  const query = emailArg
    ? { query: "SELECT * FROM c WHERE c.email = @email ORDER BY c.createdAt DESC", parameters: [{ name: "@email", value: emailArg.trim().toLowerCase() }] }
    : { query: "SELECT * FROM c ORDER BY c.createdAt DESC" };

  const { resources } = await otpCodesContainer.items.query(query, { maxItemCount: 5 }).fetchAll();

  if (resources.length === 0) {
    console.log(emailArg ? `No OTP found for ${emailArg}.` : "No OTP codes found.");
    return;
  }

  for (const doc of resources.slice(0, 5)) {
    console.log(`email=${doc.email}  code=${doc.code}  purpose=${doc.purpose}  verified=${doc.verified}  expiresAt=${doc.expiresAt}`);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
