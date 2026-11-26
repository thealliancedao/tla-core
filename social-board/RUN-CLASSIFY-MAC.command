#!/bin/bash
cd "$(dirname "$0")"
[ -z "$ANTHROPIC_API_KEY" ] && read -p "Paste ANTHROPIC_API_KEY (not saved): " ANTHROPIC_API_KEY && export ANTHROPIC_API_KEY
python3 classify.py "$@"
