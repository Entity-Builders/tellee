---
name: 'Tellee'
tagline: 'Private briefing engine for Entity Builders'
platform: 'Web'
status: 'internal'
category: 'internal'
icon: '🧭'
features:
  - 'Private diagnostic engine'
  - 'AI-generated briefing structure'
downloadUrl: ''
visible: false
---

# Tellee

Tellee is currently private Entity Builders infrastructure. Its briefing
concepts power internal and server-side brief generation experiments, but the
app itself is not public-facing in this phase.

For the Entity Builders site launch, the private
`eb-infra/supabase/functions/tellee-brief-engine` Edge Function owns the
diagnostic/brief engine actions consumed server-side by
`entitybuilders-diagnostic`.
