#!/bin/bash
# retry wrapper for flaky resolv on this host (NAT64 DNS drops)
ghr() {
  local i
  for i in 1 2 3 4 5 6; do
    if out=$(gh api "$@" 2>/tmp/.ghr.err); then
      echo "$out"; return 0
    fi
    sleep 2
  done
  echo "GHR_FAILED: $(tail -2 /tmp/.ghr.err)" >&2
  return 1
}
