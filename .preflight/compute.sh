#!/bin/bash
# Read-only preflight computations for PR #1138. No network mutation, no review posting.
cd /home/c03rad0r/repos/market || exit 1
HEAD_SHA=6be7496cc2089db2e2da04bb083312ae6d43a79d
OLD_SHA=50199dce5a11c1d33d42bfe8bdda55447e6ab5d7
MB=c8c06fd74dd3d259dfc43bf79f7da2c3590eb664

echo "### graph"
echo "master_tip=$(git rev-parse origin/master)"
echo "head=$HEAD_SHA"
echo "merge_base_master_head=$MB"
echo "is_master_tip_ancestor_of_head: $(git merge-base --is-ancestor origin/master $HEAD_SHA && echo YES || echo NO)"
echo "is_head_ancestor_of_master: $(git merge-base --is-ancestor $HEAD_SHA origin/master && echo YES || echo NO)"
echo "is_mergebase_ancestor_of_master: $(git merge-base --is-ancestor $MB origin/master && echo YES || echo NO)"
echo "commits_unique_to_head_vs_master=$(git rev-list --count origin/master..$HEAD_SHA)"
echo "commits_master_only=$(git rev-list --count $HEAD_SHA..origin/master)"
echo "head_date=$(git show -s --format=%cI $HEAD_SHA)"
echo "master_date=$(git show -s --format=%cI origin/master)"

echo
echo "### old head 50199dc relationship"
echo "is_50199dc_ancestor_of_head: $(git merge-base --is-ancestor $OLD_SHA $HEAD_SHA && echo YES || echo NO)"
echo "commits_50199dc..head=$(git rev-list --count $OLD_SHA..$HEAD_SHA)"
echo "files_50199dc..head=$(git diff --name-only $OLD_SHA..$HEAD_SHA | wc -l)"
git diff --shortstat $OLD_SHA..$HEAD_SHA

echo
echo "### review baseline 0329899"
echo "exists_0329899: $(git cat-file -t 0329899 2>/dev/null || echo ABSENT)"
echo "is_0329899_ancestor_of_head: $(git merge-base --is-ancestor 0329899 $HEAD_SHA 2>/dev/null && echo YES || echo NO-or-absent)"
git show -s --format='0329899 %cI %s' 0329899 2>/dev/null
echo "commits_0329899..head=$(git rev-list --count 0329899..$HEAD_SHA 2>/dev/null)"
git diff --shortstat 0329899..$HEAD_SHA 2>/dev/null

echo
echo "### 4828c54 (draft review base)"
echo "exists_4828c54: $(git cat-file -t 4828c54 2>/dev/null || echo ABSENT)"
echo "is_4828c54_ancestor_of_head: $(git merge-base --is-ancestor 4828c54 $HEAD_SHA 2>/dev/null && echo YES || echo NO)"
git show -s --format='4828c54 %cI %s' 4828c54 2>/dev/null
echo "draft_range_files:"
git diff --name-status 4828c54..$OLD_SHA 2>/dev/null
git diff --shortstat 4828c54..$OLD_SHA 2>/dev/null

echo
echo "### our PR commits inside head (1280: 2386aed3, 1283: da66306b)"
for c in 2386aed3b75ad7db785e9dfcda65422a8642cef6 da66306bc756b301516298ceaf3f37bebd880b7e; do
  t=$(git cat-file -t $c 2>/dev/null || echo ABSENT)
  a=NO
  if [ "$t" != "ABSENT" ]; then git merge-base --is-ancestor $c $HEAD_SHA 2>/dev/null && a=YES; fi
  echo "$c type=$t ancestor_of_head=$a"
done
