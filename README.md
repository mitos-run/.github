# .github

Organization-level community-health files and the public profile for the
[mitos-run](https://github.com/mitos-run) org.

- [`profile/README.md`](profile/README.md): the landing page rendered at
  <https://github.com/mitos-run>.
- `profile/assets/`: brand marks and the terminal demo.

## Regenerate the demo

```bash
brew install vhs                       # one-time (bundles ttyd; ffmpeg required)
printf %s 'sk-...' > ~/.mitos_api_key  # gitignored; never committed
make demo                              # renders profile/assets/demo.gif
```
