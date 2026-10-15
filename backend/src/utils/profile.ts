// Shared helper for resolving which "profile" (account owner or a family
// member) a record belongs to, and producing consistent display info for
// doctor/admin portals. profileId === patientId means "the account owner's
// own profile"; any other value must match a patient.familyMembers[].id.

import { patientsContainer } from "../config/cosmos";

// Every profile id the signed-in patient may act on: their own account id
// plus each of their familyMembers[].id. Client-supplied profile ids must be
// checked against this — never trusted — so a patient can't read or write
// records belonging to another account's profile.
export async function getOwnedProfileIds(patientId: string): Promise<Set<string>> {
  const { resource: patient } = await patientsContainer.item(patientId, patientId).read().catch(() => ({ resource: undefined as any }));
  const ids = new Set<string>([patientId]);
  for (const m of (patient?.familyMembers as any[] | undefined) ?? []) {
    if (m?.id) ids.add(m.id);
  }
  return ids;
}

// Resolves a requested profile id to one the patient owns. Absent/empty
// means "self". Returns null for a profile the patient doesn't own (caller
// responds 403).
export async function resolveOwnedProfileId(patientId: string, requested: unknown): Promise<string | null> {
  if (typeof requested !== "string" || !requested || requested === patientId) return patientId;
  const owned = await getOwnedProfileIds(patientId);
  return owned.has(requested) ? requested : null;
}

export interface ResolvedProfile {
  profileId: string;
  fullName: string;
  relationship: string; // "Self" for the account owner
  isSelf: boolean;
  gender?: string;
  dob?: string;
  avatarUrl?: string | null;
  email?: string;
  phone?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  allergies?: any;
  medications?: any;
  chronicDiseases?: any;
}

export function resolveProfileDisplay(patientDoc: any, profileId?: string | null): ResolvedProfile {
  const ownerId = patientDoc?.id ?? patientDoc?.supertokensId;
  const isSelf = !profileId || profileId === ownerId;

  if (isSelf) {
    return {
      profileId: ownerId,
      fullName: patientDoc?.fullName ?? "Unknown Patient",
      relationship: "Self",
      isSelf: true,
      gender: patientDoc?.gender ?? "",
      dob: patientDoc?.dob ?? patientDoc?.dateOfBirth ?? "",
      avatarUrl: patientDoc?.avatarUrl ?? null,
      email: patientDoc?.email ?? "",
      phone: patientDoc?.phone ?? "",
      bloodGroup: patientDoc?.bloodGroup ?? "",
      height: patientDoc?.height ?? "",
      weight: patientDoc?.weight ?? "",
      allergies: patientDoc?.allergies ?? [],
      medications: patientDoc?.medications ?? { current: [], past: [] },
      chronicDiseases: patientDoc?.chronicDiseases ?? [],
    };
  }

  const member = (patientDoc?.familyMembers ?? []).find((m: any) => m.id === profileId);
  if (!member) {
    return {
      profileId: profileId!,
      fullName: "Unknown Profile",
      relationship: "Unknown",
      isSelf: false,
    };
  }

  return {
    profileId: member.id,
    fullName: member.fullName ?? "Family Member",
    relationship: member.relationship ?? "Family Member",
    isSelf: false,
    gender: member.gender ?? "",
    dob: member.dob ?? member.dateOfBirth ?? "",
    avatarUrl: member.avatarUrl ?? null,
    email: member.email ?? "",
    phone: member.phone ?? "",
    bloodGroup: member.bloodGroup ?? "",
    height: member.height ?? "",
    weight: member.weight ?? "",
    allergies: member.allergies ?? [],
    medications: member.medications ?? { current: [], past: [] },
    chronicDiseases: member.chronicDiseases ?? [],
  };
}

// Label used across doctor/admin portals, e.g. "Lily Doe (for: John Doe's daughter)"
export function profileDisplayLabel(accountOwnerName: string, resolved: ResolvedProfile): string {
  if (resolved.isSelf) return resolved.fullName;
  return `${resolved.fullName} (${resolved.relationship} of ${accountOwnerName})`;
}

export function getAllProfiles(patientDoc: any): ResolvedProfile[] {
  const ownerId = patientDoc?.id ?? patientDoc?.supertokensId;
  const self = resolveProfileDisplay(patientDoc, ownerId);
  const members = (patientDoc?.familyMembers ?? []).map((m: any) => resolveProfileDisplay(patientDoc, m.id));
  return [self, ...members];
}
