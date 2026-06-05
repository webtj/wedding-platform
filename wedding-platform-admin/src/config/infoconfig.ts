import type { InfobarContent } from '@/components/ui/infobar';

export const billingInfoContent: InfobarContent = {
  title: 'Billing & Plans',
  sections: [
    {
      title: 'Overview',
      description:
        "The Billing page allows you to manage your organization's subscription and usage limits. Plans and subscriptions are managed through Clerk Billing for B2B, which provides organization-level subscription management with integrated Stripe payment processing.",
      links: [
        {
          title: 'Clerk Billing Documentation',
          url: 'https://clerk.com/docs/billing/overview'
        }
      ]
    },
    {
      title: 'Available Plans',
      description:
        'View and subscribe to available plans through the pricing table. Plans are created and managed in the Clerk Dashboard. Toggle "Publicly available" on plans to show them in the pricing table. Common plans include free, pro, and team tiers.',
      links: [
        {
          title: 'Clerk Dashboard - Plans',
          url: 'https://dashboard.clerk.com/~/billing/plans'
        }
      ]
    },
    {
      title: 'Plan Features',
      description:
        'Each plan can include specific features that unlock functionality in the application. Features are added to plans in the Clerk Dashboard and can be checked in code using the `has()` function with `feature` checks.',
      links: []
    },
    {
      title: 'Access Control',
      description:
        'Plans and features are used for access control throughout the application. Server-side checks use the `has()` function to verify plan or feature access. Client-side protection uses the `<Show>` component to conditionally render content based on subscription status.',
      links: []
    },
    {
      title: 'Billing Cost Structure',
      description:
        "Clerk Billing costs 0.7% per transaction, plus transaction fees paid directly to Stripe. Clerk Billing is not the same as Stripe Billing - plans and pricing are managed through the Clerk Dashboard and won't sync with existing Stripe products. Clerk uses Stripe only for payment processing.",
      links: []
    },
    {
      title: 'Setup Requirements',
      description:
        "To enable billing, navigate to Billing Settings in the Clerk Dashboard and enable billing for your application. Choose between Clerk's development gateway (for testing) or your own Stripe account (for production). Note: A Stripe account created for development cannot be used for production.",
      links: [
        {
          title: 'Billing Settings',
          url: 'https://dashboard.clerk.com/~/billing/settings'
        }
      ]
    },
    {
      title: 'Beta Status',
      description:
        'Billing is currently in Beta and its APIs are experimental and may undergo breaking changes. To mitigate potential disruptions, we recommend pinning your SDK and `clerk-js` package versions.',
      links: []
    }
  ]
};
