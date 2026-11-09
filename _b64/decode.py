import json, base64, hashlib, os, sys, tarfile, io
M = json.load(open('_b64/manifest.json'))
parts = [f'_b64/site.tar.b64.part{i:02d}' for i in range(M['parts'])]
missing = [p for p in parts if not os.path.exists(p)]
if missing:
    print('Upload incomplete, missing:', missing); sys.exit(0)
data = base64.b64decode(''.join(open(p).read() for p in parts))
assert hashlib.sha256(data).hexdigest() == M['sha256'] and len(data) == M['size'], 'checksum mismatch'
with tarfile.open(fileobj=io.BytesIO(data)) as t:
    t.extractall('.', filter='data')
print('extracted', len(t.getnames()), 'entries')
open('_b64/.done', 'w').write('1')
