<?php
$path=realpath(__DIR__.'/../public'.parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
$root=realpath(__DIR__.'/../public');
if($path&&str_starts_with($path,$root.DIRECTORY_SEPARATOR)&&is_file($path))return false;
require $root.'/index.php';
