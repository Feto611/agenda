<?php
/** Standalone installer: no Laravel, Composer or database boot required. */
declare(strict_types=1);
function prepareEnvironment(string $directory): array
{
    $directory = rtrim($directory, DIRECTORY_SEPARATOR);
    if (!is_dir($directory)) throw new RuntimeException('No existe la carpeta del proyecto.');
    $path = $directory.'/.env';
    if (is_link($path) || is_link($directory.'/.env.install.lock')) throw new RuntimeException('No se admite un enlace simbólico como archivo de configuración.');
    $lock = fopen($directory.'/.env.install.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('No se pudo bloquear la configuración.');
    chmod($directory.'/.env.install.lock', 0600);
    $temporary = null;
    try {
        $fresh = !file_exists($path);
        $text = file_get_contents($fresh ? $directory.'/.env.example' : $path);
        if ($text === false) throw new RuntimeException('No se pudo leer .env o .env.example.');
        $newline = str_contains($text, "\r\n") ? "\r\n" : "\n";
        $lines = preg_split('/\r?\n/', $text);
        $managed = ['APP_KEY','REVERB_APP_KEY','REVERB_APP_SECRET','REVERB_APP_ID','DB_PASSWORD','APP_ENV','APP_DEBUG'];
        $values = []; $positions = [];
        foreach ($lines as $index => $line) {
            if (!preg_match('/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/', $line, $m) || !in_array($m[1], $managed, true)) continue;
            $key = $m[1];
            if (array_key_exists($key, $positions)) throw new RuntimeException("La variable {$key} está duplicada en .env. Corrígela antes de instalar.");
            $raw = trim($m[2]);
            if ($raw !== '' && ($raw[0] === '"' || $raw[0] === "'")) {
                $quote = $raw[0]; $end = strpos($raw, $quote, 1);
                if ($end === false || !preg_match('/^\s*(?:#.*)?$/', substr($raw, $end + 1))) throw new RuntimeException("Formato no válido para {$key}; revisa sus comillas.");
                $value = substr($raw, 1, $end - 1);
            } else $value = str_starts_with($raw, '#') ? '' : trim(preg_replace('/\s+#.*$/', '', $raw));
            $values[$key] = $value; $positions[$key] = $index;
        }
        $generated = [];
        $assign = function(string $key, string $value) use (&$values, &$positions, &$lines): void {
            if (array_key_exists($key, $positions)) $lines[$positions[$key]] = $key.'='.$value;
            else { $positions[$key] = count($lines); $lines[] = $key.'='.$value; }
            $values[$key] = $value;
        };
        foreach (['APP_KEY','REVERB_APP_KEY','REVERB_APP_SECRET'] as $key) {
            if (($values[$key] ?? '') === '') {
                $value = $key === 'APP_KEY' ? 'base64:'.base64_encode(random_bytes(32)) : bin2hex(random_bytes($key === 'REVERB_APP_KEY' ? 16 : 32));
                $assign($key, $value); $generated[] = $key;
            }
        }
        $appKey = $values['APP_KEY'];
        $decoded = str_starts_with($appKey, 'base64:') ? base64_decode(substr($appKey, 7), true) : $appKey;
        if (!is_string($decoded) || strlen($decoded) !== 32) throw new RuntimeException('APP_KEY existente no es válida para AES-256. No se cambió: restaura la clave original de tu respaldo.');
        if (strlen($values['REVERB_APP_KEY']) < 16 || strlen($values['REVERB_APP_SECRET']) < 32 || hash_equals($values['REVERB_APP_KEY'], $values['REVERB_APP_SECRET'])) throw new RuntimeException('Las claves Reverb existentes no son válidas o son iguales. No se cambiaron; revisa su configuración.');
        if (($values['REVERB_APP_ID'] ?? '') === '') $assign('REVERB_APP_ID', 'encuentro');
        if ($fresh) {
            $assign('APP_ENV','production'); $assign('APP_DEBUG','false');
            $assign('DB_PASSWORD', bin2hex(random_bytes(24)));
        }
        $updated = rtrim(implode($newline, $lines), "\r\n").$newline;
        // A second run is byte-for-byte idempotent, including existing comments and spacing.
        if (!$fresh && !$generated && $updated === $text) { chmod($path,0600); return ['created'=>false,'generated'=>[]]; }
        $temporary = tempnam($directory, '.env-install-');
        if ($temporary === false || !chmod($temporary, 0600) || file_put_contents($temporary, $updated) !== strlen($updated)) throw new RuntimeException('No se pudo escribir la configuración privada.');
        if (!rename($temporary, $path)) throw new RuntimeException('No se pudo guardar .env.');
        $temporary = null;
        return ['created'=>$fresh,'generated'=>$generated];
    } finally {
        if ($temporary && is_file($temporary)) unlink($temporary);
        flock($lock,LOCK_UN); fclose($lock);
    }
}
if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        $result = prepareEnvironment(dirname(__DIR__));
        fwrite(STDOUT, $result['generated'] ? 'Configuración preparada. Claves generadas: '.implode(', ', $result['generated']).".\n" : "Configuración preparada. Se conservaron las claves existentes.\n");
    } catch (Throwable $e) { fwrite(STDERR, 'No se preparó la instalación: '.$e->getMessage()."\n"); exit(1); }
}
