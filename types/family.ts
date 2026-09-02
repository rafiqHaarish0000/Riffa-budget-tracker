export type Family = {
  id: string;
  name: string;
  created_by: string;
  family_code: string;
  created_at: string;
};

export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user?: {
    id: string;
    name: string | null;
    profile_image_url: string | null;
  };
};

export type CreateFamilyInput = {
  name: string;
};

export type JoinFamilyInput = {
  familyCode: string;
};

export type FamilyInvite = {
  family_id: string;
  family_name: string;
};
