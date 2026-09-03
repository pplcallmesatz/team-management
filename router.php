<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/public' . $path;
if ($path !== '/' && is_file($file)) {
    $types = ['css' => 'text/css', 'js' => 'application/javascript', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'svg' => 'image/svg+xml'];
    $extension = pathinfo($file, PATHINFO_EXTENSION);
    header('Content-Type: ' . ($types[$extension] ?? 'application/octet-stream'));
    readfile($file);
    exit;
}
require __DIR__ . '/public/index.php';
