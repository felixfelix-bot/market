#!/bin/bash
# Build the own-delta manifest for PR #1138: numstat + last-touching commit subject.
cd /home/c03rad0r/repos/market || exit 1
FORK=c8c06fd74dd3d259dfc43bf79f7da2c3590eb664
HEAD=6be7496cc2089db2e2da04bb083312ae6d43a79d
OUT=.preflight/manifest.tsv
: > $OUT

git diff --numstat -M $FORK..$HEAD | while IFS=$'\t' read -r add del path; do
  [ -z "$path" ] && continue
  subj=$(git log -1 --format='%s' $FORK..$HEAD -- "$path" | cut -c1-110)
  echo -e "$add\t$del\t$path\t$subj" >> $OUT
done

echo "rows=$(wc -l < $OUT)"
echo "total_add=$(awk -F'\t' '{s+=$1} END{print s}' $OUT)"
echo "total_del=$(awk -F'\t' '{s+=$2} END{print s}' $OUT)"
echo
echo "### by top-level path (files, +, -)"
awk -F'\t' '{split($3,p,"/"); k=p[1]; if(p[1]=="src"||p[1]=="e2e"||p[1]=="contextvm"||p[1]=="docs"){k=p[1]"/"p[2]} if(p[1]=="src"&&p[2]~/(lib|routes|components|queries|publish|hooks|server)/){k=p[1]"/"p[2]} n[k]++; a[k]+=$1; d[k]+=$2} END{for(k in n) printf "%-40s %4d files  +%-6d -%-6d\n", k, n[k], a[k], d[k]}' $OUT | sort -k2 -nr | head -40
