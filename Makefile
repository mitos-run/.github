.PHONY: demo
demo: ## Render the terminal demo GIF (needs vhs + ~/.mitos_api_key + live mitos.run)
	@command -v vhs >/dev/null 2>&1 || { echo "install vhs first: brew install vhs"; exit 1; }
	@test -f "$$HOME/.mitos_api_key" || { echo "put your key in ~/.mitos_api_key"; exit 1; }
	MITOS_API_KEY="$$(cat "$$HOME/.mitos_api_key")" vhs profile/assets/demo.tape
	@echo ">> rendered profile/assets/demo.gif"
	@echo ">> if the README still points at demo.svg, swap the <img> src to demo.gif"
