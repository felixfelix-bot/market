import subprocess, sys
sha = 'a5b9f50e0651b124f44679579a50102b4d4e34e1'
for spec in sys.argv[1:]:
    path, start, end = spec.rsplit(':', 2)
    text = subprocess.check_output(['git', 'show', f'{sha}:{path}'], text=True, cwd='/home/c03rad0r/repos/market')
    print(f'\n--- {path}:{start}-{end} ---')
    for n, line in enumerate(text.splitlines(), 1):
        if int(start) <= n <= int(end):
            print(f'{n}|{line}')
