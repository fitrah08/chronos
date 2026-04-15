<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Check auth
function checkAuth() {
    if (!isset($_SESSION['user'])) {
        sendError('Not authenticated', 401);
    }
    return $_SESSION['user'];
}

switch ($method) {
    case 'GET':
        getActivities();
        break;
    case 'POST':
        saveActivity();
        break;
    case 'DELETE':
        deleteActivity();
        break;
    default:
        sendError('Method not allowed', 405);
}

function getActivities() {
    $user = checkAuth();
    $conn = getConnection();
    
    $stmt = $conn->prepare("
        SELECT * FROM activities WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("s", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }
    
    $conn->close();
    sendResponse(['activities' => $activities]);
}

function saveActivity() {
    $user = checkAuth();
    $input = getJsonInput();
    
    $id = $input['id'] ?? generateId('act-');
    $name = $input['name'] ?? '';
    $category = $input['category'] ?? 'work';
    $color = $input['color'] ?? '#4f8fff';
    $duration = $input['duration'] ?? 60;
    $limit = $input['limit'] ?? 90;
    $icon = $input['icon'] ?? '📌';
    $bestTime = $input['bestTime'] ?? 'flexible';
    
    $conn = getConnection();
    
    // Check if exists
    $stmt = $conn->prepare("SELECT id FROM activities WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ss", $id, $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update
        $stmt = $conn->prepare("
            UPDATE activities 
            SET name = ?, category = ?, color = ?, duration = ?, limit_minutes = ?, icon = ?, best_time = ?
            WHERE id = ? AND user_id = ?
        ");
        $stmt->bind_param("sssiiisss", $name, $category, $color, $duration, $limit, $icon, $bestTime, $id, $user['id']);
    } else {
        // Insert
        $stmt = $conn->prepare("
            INSERT INTO activities (id, user_id, name, category, color, duration, limit_minutes, icon, best_time, time_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        $stmt->bind_param("sssssiiis", $id, $user['id'], $name, $category, $color, $duration, $limit, $icon, $bestTime);
    }
    
    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true, 'id' => $id]);
    } else {
        $conn->close();
        sendError('Failed to save activity', 500);
    }
}

function deleteActivity() {
    $user = checkAuth();
    $id = $_GET['id'] ?? '';
    
    if (!$id) {
        sendError('Activity ID required');
    }
    
    $conn = getConnection();
    $stmt = $conn->prepare("DELETE FROM activities WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ss", $id, $user['id']);
    
    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true]);
    } else {
        $conn->close();
        sendError('Failed to delete activity', 500);
    }
}
?>