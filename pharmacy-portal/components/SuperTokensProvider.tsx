"use client";

import SuperTokens from "supertokens-web-js";
import Session from "supertokens-web-js/recipe/session";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";

if (typeof window !== "undefined") {
  SuperTokens.init({
    appInfo: {
      appName: "Wellness Pharmacy Portal",
      apiDomain: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      apiBasePath: "/auth",
    },
    recipeList: [
      Session.init({ tokenTransferMethod: "header" }),
      EmailPassword.init(),
    ],
  });
}

export default function SuperTokensProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
