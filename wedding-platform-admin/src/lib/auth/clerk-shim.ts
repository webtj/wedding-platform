// Shim: @clerk/nextjs → our JWT auth layer (drop-in replacement)
// All imports from '@clerk/nextjs' resolve here with identical names.

export { ClerkProvider } from './auth-context';

// Hooks — client-side (same names as Clerk)
export { useAuth, useUser, useOrganization, useOrganizationList } from './index';

// Components — client-side
export { SignOutButton } from '@/components/sign-out-button';
export { UserProfile } from '@/components/user-profile';
export { OrganizationList } from '@/components/organization-list';
export { OrganizationProfile } from '@/components/organization-profile';
export { PricingTable } from '@/components/pricing-table';
export { Show } from '@/components/show';
