export type AuthContext = {
  userId: string;
  tenantId: string | null;
  memberId: string | null;
  isPlatformAdmin: boolean;
  platformLevel?: 'super' | 'admin';
  permissions: string[];
};
