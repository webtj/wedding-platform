'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  getNotificationPreferences,
  updateNotificationPreferences
} from '../api/service';
import type { NotificationPreferences } from '../api/types';

export function NotificationPreferencesForm() {
  const [, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferInApp, setPreferInApp] = useState(true);
  const [preferSms, setPreferSms] = useState(false);
  const [preferEmail, setPreferEmail] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setIsLoading(true);
      const data = await getNotificationPreferences();
      setPrefs(data);
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setPreferInApp(data.preferInApp);
      setPreferSms(data.preferSms);
      setPreferEmail(data.preferEmail);
    } catch {
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      const updated = await updateNotificationPreferences({
        phone: phone || null,
        email: email || null,
        preferInApp,
        preferSms,
        preferEmail
      });
      setPrefs(updated);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 w-full animate-pulse rounded' />
        <div className='bg-muted h-10 w-full animate-pulse rounded' />
        <div className='bg-muted h-10 w-full animate-pulse rounded' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Notification Preferences</h3>
        <p className='text-muted-foreground text-sm'>
          Configure how you receive notifications.
        </p>
      </div>

      <Separator />

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='phone'>Phone Number</Label>
          <div className='flex items-center gap-2'>
            <Icons.phone className='text-muted-foreground h-4 w-4' />
            <Input
              id='phone'
              type='tel'
              placeholder='+86 138 0000 0000'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className='max-w-sm'
            />
          </div>
          <p className='text-muted-foreground text-xs'>
            Used for SMS notifications (when enabled).
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='email'>Email Address</Label>
          <div className='flex items-center gap-2'>
            <Icons.chat className='text-muted-foreground h-4 w-4' />
            <Input
              id='email'
              type='email'
              placeholder='you@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='max-w-sm'
            />
          </div>
          <p className='text-muted-foreground text-xs'>
            Used for email notifications (when enabled).
          </p>
        </div>
      </div>

      <Separator />

      <div className='space-y-4'>
        <h4 className='text-sm font-medium'>Notification Channels</h4>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2'>
              <Icons.notification className='h-4 w-4' />
              <Label className='text-base'>In-App Notifications</Label>
            </div>
            <p className='text-muted-foreground text-sm'>
              Receive notifications within the application.
            </p>
          </div>
          <Switch checked={preferInApp} onCheckedChange={setPreferInApp} />
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2'>
              <Icons.phone className='h-4 w-4' />
              <Label className='text-base'>SMS Notifications</Label>
            </div>
            <p className='text-muted-foreground text-sm'>
              Receive notifications via SMS. Requires a valid phone number.
            </p>
          </div>
          <Switch
            checked={preferSms}
            onCheckedChange={setPreferSms}
            disabled={!phone}
          />
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2'>
              <Icons.chat className='h-4 w-4' />
              <Label className='text-base'>Email Notifications</Label>
            </div>
            <p className='text-muted-foreground text-sm'>
              Receive notifications via email. Requires a valid email address.
            </p>
          </div>
          <Switch
            checked={preferEmail}
            onCheckedChange={setPreferEmail}
            disabled={!email}
          />
        </div>
      </div>

      <div className='flex justify-end'>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
