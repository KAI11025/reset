#!/usr/bin/env python3
"""RESET data envelope tool (ECDH P-256 + AES-256-GCM, gzip inside).
  RESET_KEY=<b64 private key> python3 .github/rdata.py decrypt data/latest.enc out.json
  RESET_KEY=<b64 private key> python3 .github/rdata.py encrypt report.json reports/latest.enc data/latest.enc
(encrypt reads the app public key from the data envelope given as 3rd arg)"""
import sys, os, json, gzip, base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
def key(apub_b64):
    priv = ec.derive_private_key(int.from_bytes(base64.b64decode(os.environ['RESET_KEY']), 'big'), ec.SECP256R1())
    pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(apub_b64))
    return AESGCM(priv.exchange(ec.ECDH(), pub))
def main():
    op, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
    if op == 'decrypt':
        env = json.load(open(a))
        raw = key(env['apub']).decrypt(base64.b64decode(env['iv']), base64.b64decode(env['ct']), None)
        open(b, 'w', encoding='utf-8').write(gzip.decompress(raw).decode('utf-8'))
    elif op == 'encrypt':
        apub = json.load(open(sys.argv[4]))['apub']
        body = json.dumps(json.load(open(a, encoding='utf-8')), ensure_ascii=False).encode('utf-8')
        iv = os.urandom(12)
        ct = key(apub).encrypt(iv, gzip.compress(body), None)
        os.makedirs(os.path.dirname(b) or '.', exist_ok=True)
        json.dump({'v': 1, 'iv': base64.b64encode(iv).decode(), 'ct': base64.b64encode(ct).decode()}, open(b, 'w'))
    else: sys.exit('op?')
main()
