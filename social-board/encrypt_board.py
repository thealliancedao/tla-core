"""Wrap board.html in a passphrase-locked page you can host anywhere (Vercel, the site, a private repo).

  python encrypt_board.py                 -> locks board.html  into board.locked.html
  python encrypt_board.py public_board.html -> locks that file into public_board.locked.html
  Passphrase: env BOARD_PASSPHRASE, or you are prompted (never saved).

How it works: the whole board is encrypted with AES-256-GCM; the key is derived from your passphrase with
PBKDF2-SHA256 (600,000 rounds). The locked page is a small shell that asks for the passphrase and decrypts in the
browser with WebCrypto. Without the passphrase the file is random bytes — it can sit on a public URL.
This is real protection only with a long passphrase (think 4+ random words). A short one can be brute-forced
offline by anyone who downloads the file. Nothing is sent anywhere; decryption happens on your device.

Requires: pip install cryptography
"""
import os, sys, json, base64, getpass, hashlib, secrets

HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'board.html'
src_path = src if os.path.isabs(src) else os.path.join(HERE, src)
if not os.path.exists(src_path):
    raise SystemExit(f"{src_path} not found — run build_board.py first")

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    raise SystemExit("pip install cryptography")

pw = os.environ.get('BOARD_PASSPHRASE') or getpass.getpass('Passphrase (not saved; use 4+ words): ')
if len(pw) < 12:
    raise SystemExit("Use a longer passphrase (12+ characters, ideally several words). The file can be downloaded and attacked offline.")

ROUNDS = 600_000
salt = secrets.token_bytes(16); iv = secrets.token_bytes(12)
key = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt, ROUNDS, dklen=32)
plain = open(src_path, 'rb').read()
ct = AESGCM(key).encrypt(iv, plain, None)
b64 = lambda b: base64.b64encode(b).decode()

SHELL = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Locked</title><meta name="robots" content="noindex,nofollow">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#e6e8ee;font:15px system-ui,sans-serif}
form{background:#171a21;border:1px solid #262a33;border-radius:12px;padding:22px;width:min(92vw,360px)}
input{width:100%;box-sizing:border-box;margin:10px 0;padding:10px;border-radius:8px;border:1px solid #262a33;background:#0f1115;color:#e6e8ee;font-size:15px}
button{width:100%;padding:10px;border-radius:8px;border:0;background:#f0b429;color:#111;font-weight:600;font-size:15px;cursor:pointer}
.e{color:#e5484d;min-height:1.2em;font-size:13px}label{display:flex;gap:6px;align-items:center;font-size:13px;color:#9aa1ad}</style></head><body>
<form id="f"><div>Passphrase</div><input id="p" type="password" autocomplete="current-password" autofocus>
<label><input id="r" type="checkbox"> remember for this tab</label><button>Open</button><div class="e" id="e"></div></form>
<script>
const SALT="__SALT__",IV="__IV__",CT="__CT__",ROUNDS=__ROUNDS__;
const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function open(pw){
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:u8(SALT),iterations:ROUNDS,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u8(IV)},key,u8(CT));
  const html=new TextDecoder().decode(pt); document.open(); document.write(html); document.close();
}
document.getElementById('f').onsubmit=async ev=>{ev.preventDefault();const pw=document.getElementById('p').value;document.getElementById('e').textContent='';
  try{ if(document.getElementById('r').checked) sessionStorage.setItem('bp',pw); await open(pw);}catch(err){document.getElementById('e').textContent='Wrong passphrase.';}};
try{const s=sessionStorage.getItem('bp'); if(s) open(s).catch(()=>sessionStorage.removeItem('bp'));}catch(e){}
</script></body></html>"""

out = SHELL.replace('__SALT__', b64(salt)).replace('__IV__', b64(iv)).replace('__CT__', b64(ct)).replace('__ROUNDS__', str(ROUNDS))
dst = src_path.replace('.html', '.locked.html')
open(dst, 'w', encoding='utf-8').write(out)
print(f"wrote {dst}  ({len(out)//1024} KB). Upload this file only; keep the unlocked one private.")
