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

if (typeof window !== "undefined") {
  SuperTokens.init({
    appInfo: {
      appName: "Wellness Doctor Portal",
      apiDomain: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      apiBasePath: "/auth",
    },
    recipeList: [
      Session.init({
        tokenTransferMethod: "header",
      }),
      EmailPassword.init(),
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
