#!/bin/sh
cd /mnt/SDCARD/Apps/Loopfield || exit 1
main_pid=$(pidof MainUI)
old_pid=$(pidof loopfield)
for task_pid in $old_pid; do
    task_args=$(tr '\000' ' ' < /proc/$task_pid/cmdline)
    case "$task_args" in *--verify-project*|*--sample-verify*|*--ui-test*|*--theme-check*) echo "Verification still running; retry after it finishes."; exit 1;; esac
 done
helper_pid=
restore_menu() {
    if [ -n "$helper_pid" ]; then wait "$helper_pid" 2>/dev/null; fi
    rm -f /tmp/stay_awake
    if [ -n "$main_pid" ]; then kill -CONT "$main_pid"; fi
}
trap restore_menu EXIT INT TERM
(
    n=0
    while [ "$n" -lt 40 ]; do echo 1 > /tmp/stay_awake; sleep 0.05; n=$((n + 1)); done
) &
helper_pid=$!
if [ -n "$old_pid" ]; then
    kill -TERM "$old_pid"
    n=0
    while kill -0 "$old_pid" 2>/dev/null && [ "$n" -lt 40 ]; do sleep 0.05; n=$((n + 1)); done
    if kill -0 "$old_pid" 2>/dev/null; then exit 1; fi
fi
sleep 0.2
if [ -n "$main_pid" ]; then kill -STOP "$main_pid"; fi
echo 1 > /tmp/stay_awake
mv ./loopfield.new ./loopfield || exit 1
if [ -n "$3" ] && [ -f "$3.new" ]; then mv "$3.new" "$3" || exit 1; fi
if [ "$1" = "--sampler-check" ]; then
    sh ./launch.sh --ui-test
    if [ -n "$3" ]; then sh ./launch.sh --verify-project "$3"; else sh ./launch.sh --sample-verify; fi
fi
if [ "$1" = "--theme-check" ]; then sh ./launch.sh --theme-check; fi
if [ "$2" = "--master-full" ]; then LD_LIBRARY_PATH=/usr/trimui/lib ./loopfield --set-master 1; fi
if [ -n "$3" ]; then sh ./launch.sh --project "$3"; else sh ./launch.sh --sound; fi
