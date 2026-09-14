"use client";

/**
 * Initialises supertokens-web-js on the client side.
 *
 * NOTE: We intentionally do NOT use an `initialised` guard flag here.
 * During Next.js hot reload in development, module-level variables reset,
 * which caused a duplicate/broken interceptor state leading to 401 errors.
 * supertokens-web-js handles multiple init() calls correctly on its own.
 */
import SuperTokens from "supertokens-web-js";
import Session from "supertokens-web-js/recipe/session";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";

// Sent on every EmailPassword SDK call (sign-in included) so the backend's
// signInPOST override can reject an account that belongs to a different
// organization than this portal deployment — see NEXT_PUBLIC_ORG_SLUG.
async function addOrgSlugHeader(context: { url: string; requestInit: RequestInit }) {
  const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
  if (orgSlug) {
    context.requestInit.headers = {
      ...context.requestInit.headers,
      "X-Org-Slug": orgSlug,
    };
  }
  return context;
}

if (typeof window !== "undefined") {
  SuperTokens.init({
    appInfo: {
      appName: "Wellness Clinic Portal",
      apiDomain: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      apiBasePath: "/auth",
    },
    recipeList: [
      Session.init({
        tokenTransferMethod: "header",
      }),
      EmailPassword.init({ preAPIHook: addOrgSlugHeader }),
    ],
  });
}

export default function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
