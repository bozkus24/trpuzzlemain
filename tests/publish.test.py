import base64,hashlib,importlib.util,re,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('publish',ROOT/'tools/build_publish.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PublicationTests(unittest.TestCase):
 def test_private_and_development_files_are_excluded(self):
  for name in ['.env','.git/HEAD','tools/preview.py','tests/security.test.cjs','AGENTS.md','README.md','package-lock.json','index.src.html','node_modules/foo/index.js','assets/.env','server/catalog.enc','server/engines.js','netlify/functions/game.js','.server-private/catalog.json']:
   self.assertFalse(module.allowed(Path(name)),name)
 def test_game_dependencies_stay_available(self):
  for name in ['index.html','game.js','words.js','style.css','cevaplar.txt','kelimehavuzu.txt','ads.txt','assets/fonts/font.woff2']:
   self.assertTrue(module.allowed(Path(name)),name)
 def test_all_nine_publications(self):
  for repo in ['trpuzzlemain','harfle','word500turkce','trpuzzle4','arala','trpuzzle6','trpuzzle3','trpuzzle1','trpuzzle2']:
   folder=ROOT.parent/repo/'dist'
   self.assertTrue((folder/'index.html').is_file(),repo)
   self.assertFalse((folder/'tools').exists(),repo)
   self.assertFalse((folder/'AGENTS.md').exists(),repo)
   self.assertFalse((folder/'package-lock.json').exists(),repo)
   header=(folder/'_headers').read_text()
   self.assertIn('Content-Security-Policy-Report-Only:',header)
   for html in folder.rglob('*.html'):
    for attrs,code in re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',html.read_text(),re.I):
     if 'src=' not in attrs and code.strip():
      digest=base64.b64encode(hashlib.sha256(code.encode()).digest()).decode()
      self.assertIn(digest,header,str(html))
if __name__=='__main__':unittest.main()
