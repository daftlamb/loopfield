#!/bin/sh
cd "$(dirname "$0")" || exit 1
export LD_LIBRARY_PATH="/usr/trimui/lib:$LD_LIBRARY_PATH"
export SDL_AUDIODRIVER=alsa
had_awake=0
if [ -e /tmp/stay_awake ]; then had_awake=1; else echo 1 > /tmp/stay_awake; fi
restore_sleep() {
    if [ "$had_awake" = 0 ]; then rm -f /tmp/stay_awake; fi
}
trap restore_sleep EXIT INT TERM
./loopfield "$@" >>run.log 2>&1
