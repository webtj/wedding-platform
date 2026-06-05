-- Remove Pollinations provider from persisted AI image settings.
-- Migrate existing ai.image configs to OpenAI-compatible defaults.

UPDATE "platform_settings"
SET "value" = jsonb_set(
  jsonb_set(
    jsonb_set(
      "value"::jsonb,
      '{provider}',
      '"openai"'::jsonb,
      true
    ),
    '{baseUrl}',
    '"https://api.openai.com/v1"'::jsonb,
    true
  ),
  '{model}',
  '"gpt-image-1"'::jsonb,
  true
)
WHERE "key" = 'ai.image'
  AND ("value"::jsonb ->> 'provider') = 'pollinations';
