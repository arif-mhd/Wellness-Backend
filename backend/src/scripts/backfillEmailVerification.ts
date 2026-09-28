/**
 * Marks existing patients' emails as verified in SuperTokens.
 *
 * Why this is safe: POST /api/patients/register has always refused to create a
 * patient without a verified OTP (it returns OTP_NOT_VERIFIED). So every
 * patient document in Cosmos is evidence that the address was proven at
 * registration. SuperTokens was simply never told, because the
 * EmailVerification recipe did not exist until Google sign-in needed it.
 *
 * Why it matters: account linking refuses to attach a Google identity to an
 * account whose email is unverified — correctly, since otherwise anyone able
 * to create a Google account on that address could take the account over. The
 * symptom is SIGN_IN_UP_NOT_ALLOWED (ERR_CODE_006) on an otherwise correct
 * sign-in.
 *
 * Scope is deliberately limited to accounts that have a patient document.
 * A SuperTokens credential with no patient record carries no proof that anyone
 * passed an OTP — it may be an abandoned or half-completed registration — so
 * those are reported and skipped rather than verified on assumption.
 *
 * Defaults to a DRY RUN:
 *   npx ts-node src/scripts/backfillEmailVerification.ts
 * Pass --apply to write:
 *   npx ts-node src/scripts/backfillEmailVerification.ts --apply
 */

import "dotenv/config";
import supertokens from "supertokens-node";
import { initSuperTokens } from "../config/supertokens";
import { patientsContainer } from "../config/cosmos";
import { markEmailVerified } from "../utils/markEmailVerified";

const APPLY = process.argv.includes("--apply");

async function main() {
  initSuperTokens();

  const { resources: patients } = await patientsContainer.items
    .query({
      query:
        "SELECT c.id, c.email, c.status FROM c WHERE IS_DEFINED(c.email) AND c.email != '' AND (NOT IS_DEFINED(c.status) OR c.status = 'active')",
    } as any)
    .fetchAll();

  console.log(`${patients.length} active patient(s) with an email\n`);

  let alreadyVerified = 0;
  let toVerify = 0;
  let verified = 0;
  let noStAccount = 0;
  let failed = 0;

  for (const p of patients as any[]) {
    const email = String(p.email).trim().toLowerCase();
    const users = await supertokens.listUsersByAccountInfo("public", { email });

    if (users.length === 0) {
      noStAccount++;
      continue;
    }

    for (const user of users) {
      for (const lm of user.loginMethods) {
        if (lm.recipeId !== "emailpassword") continue;
        if (lm.verified) {
          alreadyVerified++;
          continue;
        }

        toVerify++;
        if (!APPLY) {
          console.log(`  would verify: ${email}`);
          continue;
        }

        const ok = await markEmailVerified(lm.recipeUserId.getAsString(), email);
        if (ok) {
          verified++;
          console.log(`  verified: ${email}`);
        } else {
          failed++;
          console.warn(`  FAILED:   ${email}`);
        }
      }
    }
  }

  console.log(`\nalready verified          : ${alreadyVerified}`);
  console.log(`${APPLY ? "verified" : "would verify"}              : ${APPLY ? verified : toVerify}`);
  if (failed) console.log(`failed                    : ${failed}`);
  if (noStAccount) console.log(`patient doc, no ST account: ${noStAccount}`);

  if (!APPLY) {
    console.log(`\nDry run — nothing written. Re-run with --apply.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
