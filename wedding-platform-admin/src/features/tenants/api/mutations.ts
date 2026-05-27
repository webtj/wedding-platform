import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createTenant, updateTenant, deleteTenant } from './service';
import { tenantKeys } from './queries';

export const createTenantMutation = mutationOptions({
  mutationFn: (data: { name: string; description?: string }) => createTenant(data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: tenantKeys.all })
});

export const updateTenantMutation = mutationOptions({
  mutationFn: ({
    id,
    data
  }: {
    id: string;
    data: { name?: string; description?: string; status?: string };
  }) => updateTenant(id, data),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: tenantKeys.all })
});

export const deleteTenantMutation = mutationOptions({
  mutationFn: (id: string) => deleteTenant(id),
  onSuccess: () => getQueryClient().invalidateQueries({ queryKey: tenantKeys.all })
});
