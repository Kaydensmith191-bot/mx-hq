#!/bin/sh
# Rebuild index.html from the source parts, stamped with a build number the app uses to spot updates
cd "$(dirname "$0")" && B=$(date -u +%Y%m%d%H%M%S) && cat src/head.html src/logic.js src/injury.js src/gps.js src/gpsui.js src/gpsui2.js src/web.js src/devices.js src/onboard.js src/review.js src/ui.js | sed "s/__MXBUILD__/$B/" > index.html && printf '%s' "$B" > version.txt
