# illustrations-lib

A Next.js app that showcases Hairline line illustrations: isometric, single-stroke figures that answer the pointer.

## Layout

- `illustrations/hardware/*.js`: figure sources (hardware: `device`, `stack`, `platform`, `rack`)
- `illustrations/ui/*.js`: figure sources (interface pieces: `apps`, `toggle`, `keys`)
- `public/illustrations/hairline-*.html`: the built, self-contained pages
- `src/app/page.tsx`: the showcase page, one frame per figure

## Rebuilding a figure

Figures are built with the `hairline-create` skill. After editing a source:

```bash
node ~/.claude/skills/hairline-create/build.mjs illustrations/hardware/device.js public/illustrations/hairline-device.html
node ~/.claude/skills/hairline-create/validate.mjs public/illustrations/hairline-device.html
```

## Development

```bash
npm run dev
```
