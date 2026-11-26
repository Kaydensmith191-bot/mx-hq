#!/bin/sh
# Rebuild index.html from the source parts
cd "$(dirname "$0")" && cat src/head.html src/logic.js src/gps.js src/gpsui.js src/gpsui2.js src/web.js src/onboard.js src/ui.js > index.html
