<?php
require_once __DIR__ . '/../vendor/autoload.php'; 

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$mapboxAccessToken = $_ENV['MAPBOX_ACCESS_TOKEN'];
echo "const mapboxAccessToken = '$mapboxAccessToken';";
?>