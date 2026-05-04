## UI / Styling

- CSS framework: Tailwind CSS v4
- UI components: bits-ui
- Do not use Tailwind v3 syntax (e.g. `@apply` is deprecated in v4)
- Do not implement UI components from scratch if bits-ui provides them

## Migration Policy

- Existing code that uses Tailwind v3 syntax must be rewritten to v4
- Existing hand-rolled UI components must be replaced with bits-ui equivalents where available
- When touching any file, check and fix its styling to conform to the above rules

## Nostr NIPs

When implementing any Nostr feature, always fetch the relevant NIP specification first.
Fetch from: https://raw.githubusercontent.com/nostr-protocol/nips/master/{nn}.md
Save the fetched content to `.nostr-nips/{nn}.md` in this project.
If `.nostr-nips/{nn}.md` already exists, use that cached version instead of fetching again.
Always implement strictly according to the fetched NIP specification.