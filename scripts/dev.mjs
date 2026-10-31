import {readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
const local=existsSync('.sites-runtime/php.json')?JSON.parse(readFileSync('.sites-runtime/php.json','utf8')):{};
const php=process.env.PHP_BINARY||local.executable||'php';
const child=spawn(php,['-S',`0.0.0.0:${process.env.PORT||4173}`,'-t','public','scripts/router.php'],{stdio:'inherit'});
child.on('error',()=>{process.stderr.write('No se encontró PHP. Instala PHP 8.3 o utiliza Docker.\n');process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??0});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
