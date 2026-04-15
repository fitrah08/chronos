<?php
// Chronos API Configuration
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration for Laragon
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');  // Laragon default no password
define('DB_NAME', 'chronos_db');

// Create connection
function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
        exit();
    }
    
    $conn->set_charset('utf8mb4');
    return $conn;
}

// Helper: Generate UUID
function generateId($prefix = '') {
    return $prefix . uniqid() . '-' . bin2hex(random_bytes(4));
}

// Helper: Get JSON input
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

// Helper: Send JSON response
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

// Helper: Send error
function sendError($message, $status = 400) {
    sendResponse(['error' => $message], $status);
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>