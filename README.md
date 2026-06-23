# .github

Organization-level community-health files and the public profile for the
[mitos-run](https://github.com/mitos-run) org.

- [`profile/README.md`](profile/README.md): the landing page rendered at
  <https://github.com/mitos-run>.
- `profile/assets/`: brand marks and the terminal demo.

## Regenerate the demo

The hero is rendered from [`profile/assets/demo.tape`](profile/assets/demo.tape)
with [Charm VHS](https://github.com/charmbracelet/vhs), so it is reproducible and
never goes stale.

```bash
brew install vhs                 # one-time (bundles ttyd; ffmpeg required)
export MITOS_API_KEY=sk-...       # live render against https://mitos.run
make demo                        # writes profile/assets/demo.gif
```

The launch GIF was rendered offline (no cluster or key) against a local
SDK-compatible stub by setting `MITOS_DEMO_PYTHONPATH`; the commands and outputs
shown are the real `mitos-run` SDK's behavior for those calls.
