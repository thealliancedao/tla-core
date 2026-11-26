#!/bin/bash
cd "$(dirname "$0")"
python3 publish.py
python3 make_public_repo.py
read -p "done"
