# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- AI Workbench: Conversational image generation system
  - Text-to-image generation (vow cards, menu cards, welcome signs, pet witness cards)
  - Image-to-image generation with reference images
  - Multi-round conversation with design state persistence
  - Intent recognition and prompt planning
  - Server-side text composition (SVG/Sharp)
  - Real-time progress via SSE
  - Provider routing (OpenAI compatible + ModelScope)
  - Usage metrics and feedback system

### Changed
- Migrated from Pollinations to OpenAI-compatible providers
- Added project context to AI generations
- Added conversation persistence with message history

## [0.1.0] - 2026-05-22

### Added
- Initial release
- CRM (leads, followups, conversions)
- Contract management with e-signature
- Project management (kanban, stages, tasks)
- Finance tracking
- Template system
- RBAC permissions with multi-tenancy
- Clerk auth shim for custom authentication
