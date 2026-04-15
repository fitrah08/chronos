<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

function checkAuth() {
    if (!isset($_SESSION['user'])) {
        sendError('Not authenticated', 401);
    }
    return $_SESSION['user'];
}

// Default quests
$DEFAULT_QUESTS = [
    ['id' => 'q1', 'name' => 'Time Novice', 'description' => 'Complete 5 focus sessions', 'target' => 5, 'reward' => 100, 'category' => 'daily'],
    ['id' => 'q2', 'name' => 'Early Bird', 'description' => 'Start 3 tasks before 9 AM', 'target' => 3, 'reward' => 150, 'category' => 'daily'],
    ['id' => 'q3', 'name' => 'Limit Keeper', 'description' => 'Stay within limits for all activities', 'target' => 1, 'reward' => 200, 'category' => 'daily'],
    ['id' => 'q4', 'name' => 'Week Warrior', 'description' => 'Maintain streak for 7 days', 'target' => 7, 'reward' => 500, 'category' => 'weekly'],
    ['id' => 'q5', 'name' => 'Focus Master', 'description' => 'Complete 10 hours of deep work', 'target' => 600, 'reward' => 300, 'category' => 'weekly'],
];

switch ($method) {
    case 'GET':
        getQuests();
        break;
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'claim') {
            claimQuest();
        } else {
            updateQuest();
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

function getQuests() {
    $user = checkAuth();
    $conn = getConnection();
    
    // Initialize default quests for user if not exist
    foreach ($GLOBALS['DEFAULT_QUESTS'] as $quest) {
        $stmt = $conn->prepare("
            INSERT IGNORE INTO quests (id, user_id, quest_id, name, description, category, target, progress, reward, completed, claimed)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, FALSE, FALSE)
        ");
        $questId = 'qst-' . $user['id'] . '-' . $quest['id'];
        $stmt->bind_param("ssssssii", 
            $questId, $user['id'], $quest['id'], $quest['name'], 
            $quest['description'], $quest['category'], $quest['target'], $quest['reward']
        );
        $stmt->execute();
    }
    
    // Get quests
    $stmt = $conn->prepare("
        SELECT * FROM quests WHERE user_id = ?
        ORDER BY category, quest_id
    ");
    $stmt->bind_param("s", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $quests = [];
    while ($row = $result->fetch_assoc()) {
        $quests[] = $row;
    }
    
    $conn->close();
    sendResponse(['quests' => $quests]);
}

function updateQuest() {
    $user = checkAuth();
    $input = getJsonInput();
    
    $questId = $input['questId'] ?? '';
    $progress = $input['progress'] ?? 0;
    
    if (!$questId) {
        sendError('Quest ID required');
    }
    
    $conn = getConnection();
    
    $stmt = $conn->prepare("
        UPDATE quests 
        SET progress = ?, completed = (progress >= target)
        WHERE user_id = ? AND quest_id = ?
    ");
    $stmt->bind_param("iss", $progress, $user['id'], $questId);
    
    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true]);
    } else {
        $conn->close();
        sendError('Failed to update quest', 500);
    }
}

function claimQuest() {
    $user = checkAuth();
    $input = getJsonInput();
    
    $questId = $input['questId'] ?? '';
    
    if (!$questId) {
        sendError('Quest ID required');
    }
    
    $conn = getConnection();
    
    // Get quest
    $stmt = $conn->prepare("
        SELECT * FROM quests 
        WHERE user_id = ? AND quest_id = ? AND completed = TRUE AND claimed = FALSE
    ");
    $stmt->bind_param("ss", $user['id'], $questId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $conn->close();
        sendError('Quest not completed or already claimed');
    }
    
    $quest = $result->fetch_assoc();
    
    // Update quest claimed
    $stmt = $conn->prepare("
        UPDATE quests SET claimed = TRUE 
        WHERE user_id = ? AND quest_id = ?
    ");
    $stmt->bind_param("ss", $user['id'], $questId);
    $stmt->execute();
    
    // Add XP to user
    $stmt = $conn->prepare("
        UPDATE users SET xp = xp + ? WHERE id = ?
    ");
    $stmt->bind_param("is", $quest['reward'], $user['id']);
    $stmt->execute();
    
    // Update session
    $_SESSION['user']['xp'] += $quest['reward'];
    
    $conn->close();
    sendResponse(['success' => true, 'reward' => $quest['reward']]);
}
?>