"""Run the real installer with Docker commands stubbed; never starts containers."""
import os, pathlib, shutil, subprocess, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
PHP = os.environ.get('TEST_PHP_BIN', 'php')
class InstallerFlowTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='encuentro-install-')
        self.root = pathlib.Path(self.temp.name)
        (self.root/'scripts').mkdir(); (self.root/'bin').mkdir()
        for f in ['install.sh','.env.example','scripts/prepare-env.php']: shutil.copy(ROOT/f, self.root/f)
        docker = self.root/'bin/docker'
        docker.write_text('''#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$TEST_LOG"
if [[ "$1" == run ]]; then exec "$TEST_NATIVE_PHP" scripts/prepare-env.php; fi
if [[ "$1 $2" == 'compose build' ]]; then
    [[ -f .env ]] || exit 91
    grep -q '^APP_KEY=base64:' .env || exit 92
    grep -Eq '^REVERB_APP_SECRET=[a-f0-9]{64}$' .env || exit 93
fi
if [[ "${TEST_FAIL_MIGRATION:-0}" == 1 && "$*" == *'artisan migrate'* ]]; then exit 94; fi
''')
        docker.chmod(0o755)
        php = self.root/'bin/php'; php.write_text('#!/bin/sh\nexec "$TEST_NATIVE_PHP" "$@"\n'); php.chmod(0o755)
        self.env = dict(os.environ, PATH=str(self.root/'bin')+':'+os.environ['PATH'], TEST_LOG=str(self.root/'calls'), TEST_NATIVE_PHP=PHP)
    def tearDown(self): self.temp.cleanup()
    def run_installer(self, *args): return subprocess.run(['bash','install.sh',*args],cwd=self.root,env=self.env,text=True,capture_output=True)
    def test_fresh_and_upgrade_preserve_keys_and_wait_for_db_before_migration(self):
        first=self.run_installer(); self.assertEqual(first.returncode,0,first.stderr)
        before=(self.root/'.env').read_bytes(); second=self.run_installer(); self.assertEqual(second.returncode,0,second.stderr)
        self.assertEqual(before,(self.root/'.env').read_bytes())
        calls=(self.root/'calls').read_text()
        self.assertLess(calls.index('compose up -d --wait db'),calls.index('artisan migrate --force'))
        self.assertLess(calls.index('artisan migrate --force'),calls.index('compose up -d --force-recreate'))
        self.assertNotIn('base64:',first.stdout+first.stderr)
    def test_docker_bootstrap_without_host_php(self):
        (self.root/'bin/php').write_text('#!/bin/sh\nexit 1\n')
        result=self.run_installer('--prepare-only'); self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('php:8.3-cli-alpine',(self.root/'calls').read_text())
        self.assertNotIn('compose build',(self.root/'calls').read_text())
        self.assertTrue((self.root/'.env').exists())
    def test_failed_migration_stops_before_service_recreation(self):
        self.env['TEST_FAIL_MIGRATION']='1'
        result=self.run_installer(); self.assertNotEqual(result.returncode,0)
        self.assertNotIn('compose up -d --force-recreate',(self.root/'calls').read_text())
    def test_invalid_option_does_not_create_configuration(self):
        result=self.run_installer('--unknown'); self.assertNotEqual(result.returncode,0)
        self.assertFalse((self.root/'.env').exists())
if __name__=='__main__': unittest.main(verbosity=2)
