/**
 * One-time helper to set an organization's country (and, through it, its
 * default currency — see src/config/countries.ts) via a direct DB update.
 * The admin-portal UI can now do this too (see its organizations page), but
 * this script exists because:
 *   - it's the fastest way to fix an org that predates the UI support, and
 *   - it prints the current row first, so you can confirm you're changing
 *     the right one before writing anything.
 *
 * Defaults to a DRY RUN — prints the current row and what would change
 * without writing.
 *   npx ts-node src/scripts/setOrgCountry.ts <slug> <countryCode>
 * Pass --apply to actually perform the write:
 *   npx ts-node src/scripts/setOrgCountry.ts <slug> <countryCode> --apply
 *
 * Example (this is the actual case this script was written for):
 *   npx ts-node src/scripts/setOrgCountry.ts anandalakshmi IN --apply
 */

import "dotenv/config";
import { pool } from "../config/database";
import { COUNTRY_CODES, getCountryConfig } from "../config/countries";

const APPLY = process.argv.includes("--apply");
const [, , slugArg, countryCodeArg] = process.argv.filter((a) => a !== "--apply");

async function main() {
  if (!slugArg || !countryCodeArg) {
    console.error("Usage: npx ts-node src/scripts/setOrgCountry.ts <slug> <countryCode> [--apply]");
    process.exit(1);
  }

  const countryCode = countryCodeArg.toUpperCase();
  if (!COUNTRY_CODES.includes(countryCode)) {
    console.error(`Unknown country code '${countryCode}'. Valid codes: ${COUNTRY_CODES.join(", ")}`);
    process.exit(1);
  }

  const { rows } = await pool.query(
    `SELECT id, slug, name, country_code, currency_code FROM organizations WHERE slug = $1`,
    [slugArg]
  );
  const org = rows[0];
  if (!org) {
    console.error(`No organization found with slug '${slugArg}'.`);
    process.exit(1);
  }

  const countryConfig = getCountryConfig(countryCode);
  console.log(`Org: ${org.name} (slug=${org.slug}, id=${org.id})`);
  console.log(`Current: country_code=${org.country_code}, currency_code=${org.currency_code ?? "(null, defaults per country)"}`);
  console.log(`New:     country_code=${countryCode} -> defaultCurrency=${countryConfig.defaultCurrency.code} (${countryConfig.defaultCurrency.symbol})`);
  console.log(`currency_code column is left untouched (stays NULL unless already overridden) — it will resolve to ${countryConfig.defaultCurrency.code} automatically.`);

  if (org.country_code === countryCode) {
    console.log("\nAlready set to this country — nothing to change.");
    return;
  }

  if (APPLY) {
    await pool.query(`UPDATE organizations SET country_code = $1, updated_at = NOW() WHERE id = $2`, [countryCode, org.id]);
    console.log("\nUpdated.");
  } else {
    console.log("\nRe-run with --apply to write this change.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("setOrgCountry failed:", err);
    process.exit(1);
  });
