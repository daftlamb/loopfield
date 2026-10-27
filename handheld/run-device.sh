#!/bin/sh
cd /mnt/SDCARD/Apps/Loopfield || exit 1
main_pid=$(pidof MainUI)
resume_menu() {
    if [ -n "$main_pid" ]; then kill -CONT "$main_pid"; fi
}
trap resume_menu EXIT INT TERM
if [ -n "$main_pid" ]; then kill -STOP "$main_pid"; fi
sh ./launch.sh "$@"
