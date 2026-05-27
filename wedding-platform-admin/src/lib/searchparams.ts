import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const searchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  name: parseAsString,
  search: parseAsString,
  gender: parseAsString,
  category: parseAsString,
  role: parseAsString,
  roleCode: parseAsString,
  tenantId: parseAsString,
  status: parseAsString,
  sort: parseAsString
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
