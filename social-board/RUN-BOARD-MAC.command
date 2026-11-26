#!/bin/bash
cd "$(dirname "$0")"
FROM=$(python3 -c "import datetime;print((datetime.date.today()-datetime.timedelta(days=365)).isoformat())")
python3 build_board.py --from $FROM && python3 build_board.py --public --from $FROM && open board.html
