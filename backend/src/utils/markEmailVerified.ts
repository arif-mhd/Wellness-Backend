/**
 * Records in SuperTokens that an email has been verified.
 *
 * The app already proves this: POST /api/patients/register refuses to run
 * without a verified OTP (OTP_NOT_VERIFIED). SuperTokens was simply never
 * told, because the EmailVerification recipe did not exist until Google
 * sign-in needed it.
 *
 * It matters because account linking will not attach a Google identity to an
 * existing account whose email is unverified — correctly, since otherwise
 * anyone able to create a Google account on that address could take the
 * account over. The visible symptom is SIGN_IN_UP_NOT_ALLOWED (ERR_CODE_006)
 * on an otherwise correct sign-in.
 *
 * Never call this without independent evidence the address really belongs to
 * the user. Passing an OTP is such evidence; merely having registered is not.
 *
 * Non-fatal by design: a patient who registers successfully should not see an
 * error because this bookkeeping failed. The backfill can repair it later.
 */

import EmailVerification from "supertokens-node/recipe/emailverification";
import { RecipeUserId } from "supertokens-node";

export async function markEmailVerified(
  supertokensId: string,
  email: string
): Promise<boolean> {
  try {
    const recipeUserId = new RecipeUserId(supertokensId);
    const token = await EmailVerification.createEmailVerificationToken(
      "public",
      recipeUserId,
      email
    );

    // Already verified — nothing to do, and not an error.
    if (token.status === "EMAIL_ALREADY_VERIFIED_ERROR") return true;
    if (token.status !== "OK") return false;

    const result = await EmailVerification.verifyEmailUsingToken("public", token.token);
    return result.status === "OK";
  } catch (err) {
    console.error(`[markEmailVerified] failed for ${supertokensId}:`, err);
    return false;
  }
}
