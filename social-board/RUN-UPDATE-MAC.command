#!/bin/bash
cd "$(dirname "$0")"
python3 update.py "$@"
read -p "done"
