#!/bin/bash
cd /home/c03rad0r/repos/market || exit 1
HEAD_SHA=6be7496cc2089db2e2da04bb083312ae6d43a79d
FORK=c8c06fd74dd3d259dfc43bf79f7da2c3590eb664
OLD=50199dce5a11c1d33d42bfe8bdda55447e6ab5d7
LASTREV=eacc4256960217b14553e68b179bd34e68a91d01   # newest posted review commit (2026-09-26)
DRAFTBASE=4828c54e

echo "### A. delta since newest posted review (eacc4256..head)"
echo "commits=$(git rev-list --count $LASTREV..$HEAD_SHA)"
git diff --shortstat $LASTREV..$HEAD_SHA
echo "--- files ---"
git diff --name-status $LASTREV..$HEAD_SHA
echo
echo "### B. delta since scheduling head 50199dc (moved delta)"
echo "commits=$(git rev-list --count $OLD..$HEAD_SHA)"
echo
echo "### C. are the 4 draft-review files touched after 50199dc?"
for f in src/lib/__tests__/fetchMintKeysets.test.ts src/lib/__tests__/settlementDescriptor.test.ts src/lib/auction/settlementDescriptor.ts src/lib/auction/validation.ts; do
  n=$(git log --oneline $OLD..$HEAD_SHA -- "$f" | wc -l)
  echo "$f -> commits_since_50199dc=$n"
done
echo
echo "### D. do the draft-range changes still exist verbatim at head?"
git diff --stat $DRAFTBASE..$OLD -- src/lib/__tests__/fetchMintKeysets.test.ts src/lib/__tests__/settlementDescriptor.test.ts src/lib/auction/settlementDescriptor.ts src/lib/auction/validation.ts
echo "--- draftbase blob vs head blob per file ---"
for f in src/lib/__tests__/fetchMintKeysets.test.ts src/lib/__tests__/settlementDescriptor.test.ts src/lib/auction/settlementDescriptor.ts src/lib/auction/validation.ts; do
  a=$(git rev-parse $OLD:$f 2>/dev/null | cut -c1-12)
  b=$(git rev-parse $HEAD_SHA:$f 2>/dev/null | cut -c1-12)
  if [ "$a" = "$b" ]; then s="IDENTICAL"; else s="CHANGED"; fi
  echo "$f old=$a head=$b $s"
done
