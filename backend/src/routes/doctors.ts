import { Router, Request, Response } from "express";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import { doctorsContainer } from "../config/cosmos";

const router = Router();

// ─── POST /api/doctors/register ─────────────────────────────────────────────
// Public endpoint — called by the doctor portal signup flow (step 4).
// Creates the SuperTokens account, assigns the "doctor_pending" role,
// and saves the full registration profile to Cosmos with status "pending_approval".
// The doctor CANNOT log in to the dashboard until an admin approves them.
router.post("/register", async (req: Request, res: Response) => {
  const {
    email,
    password,
    fullName,
    phone,
    dateOfBirth,
    gender,
    emiratesId,
  } = req.body;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!email || !password || !fullName || !phone) {
    res.status(400).json({
      error: "email, password, fullName and phone are required.",
    });
    return;
  }

  try {
    // ── 1. Create SuperTokens account ─────────────────────────────────────
    // We call the Node SDK directly (bypassing the signUpPOST override that
    // expects extra form fields like "name" and "role").
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Registration failed. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    // ── 2. Assign "doctor_pending" role ───────────────────────────────────
    // This role blocks dashboard access. It is upgraded to "doctor" on approval.
    await UserRoles.addRoleToUser("public", supertokensId, "doctor_pending");

    // ── 3. Save registration details to Cosmos ────────────────────────────
    const now = new Date().toISOString();
    const doctorDoc = {
      id:             supertokensId,   // Cosmos id = ST userId
      supertokens_id: supertokensId,
      status:         "pending_approval",
      email,
      fullName,
      phone,
      dateOfBirth:    dateOfBirth  || null,
      gender:         gender       || null,
      emiratesId:     emiratesId   || null,
      // Fields filled in after onboarding
      specialty:      null,
      license:        null,
      bio:            null,
      fees:           null,
      languages:      null,
      // Timestamps
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
    };

    await doctorsContainer.items.upsert(doctorDoc);

    res.status(201).json({ status: "OK", message: "Registration submitted successfully." });
  } catch (err) {
    console.error("Doctor registration error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
