.PHONY: demo
demo: ## Render the terminal demo GIF (Charm VHS) -> profile/assets/demo.gif
	@command -v vhs >/dev/null 2>&1 || { echo "install vhs first: brew install vhs"; exit 1; }
	vhs profile/assets/demo.tape
	@echo ">> rendered profile/assets/demo.gif"

# The tape records a real Python session against a mitos sandbox.
#   Live    : export MITOS_API_KEY=sk-...   (base URL defaults to https://mitos.run)
#   Offline : export MITOS_DEMO_PYTHONPATH=/path/to/an/SDK-compatible/stub
#             (renders with no cluster or key; the launch GIF was made this way)
