import PageContainer from '@/components/layout/page-container';
import { NotificationPreferencesForm } from '@/features/notifications/components/notification-preferences';

export default function NotificationPreferencesPage() {
  return (
    <PageContainer
      pageTitle='Notification Settings'
      pageDescription='Configure how you receive notifications.'
    >
      <div className='max-w-2xl'>
        <NotificationPreferencesForm />
      </div>
    </PageContainer>
  );
}
