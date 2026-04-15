<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'session':
        getSession();
        break;
    default:
        sendError('Invalid action', 404);
}

function handleRegister() {
    $input = getJsonInput();
    
    $fullName = $input['fullName'] ?? '';
    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (!$fullName || !$username || !$email || !$password) {
        sendError('All fields are required');
    }
    
    if (strlen($password) < 8) {
        sendError('Password must be at least 8 characters');
    }
    
    $conn = getConnection();
    
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $conn->close();
        sendError('Username or email already taken');
    }
    $stmt->close();
    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $userId = 'user-' . uniqid() . '-' . bin2hex(random_bytes(4));
    $settings = json_encode(['theme' => 'dark', 'accentColor' => '#4f8fff', 'animations' => true]);
    
    $stmt = $conn->prepare("
        INSERT INTO users (id, username, password, full_name, email, phone, photoURL, role, level, xp, settings)
        VALUES (?, ?, ?, ?, ?, '', NULL, 'user', 1, 0, ?)
    ");
    $stmt->bind_param("ssssss", $userId, $username, $hashedPassword, $fullName, $email, $settings);
    
    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true, 'message' => 'Account created successfully']);
    } else {
        $conn->close();
        sendError('Failed to create account: ' . $stmt->error, 500);
    }
}

function handleLogin() {
    $input = getJsonInput();
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (!$username || !$password) {
        sendError('Username and password required');
    }
    
    $conn = getConnection();
    
    $stmt = $conn->prepare("
        SELECT id, username, password, full_name, email, phone, photoURL, role, level, xp, quests_completed, settings
        FROM users 
        WHERE username = ? OR email = ?
    ");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $conn->close();
        sendError('Invalid username or password');
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    
    if (!password_verify($password, $user['password'])) {
        sendError('Invalid username or password');
    }
    
    unset($user['password']);
    
    $_SESSION['user'] = [
        'id' => $user['id'],
        'username' => $user['username'],
        'fullName' => $user['full_name'],
        'email' => $user['email'],
        'phone' => $user['phone'] ?? '',
        'photoURL' => $user['photoURL'] ?? null,
        'role' => $user['role'],
        'level' => (int)$user['level'],
        'xp' => (int)$user['xp'],
        'questsCompleted' => $user['quests_completed'] ? json_decode($user['quests_completed'], true) : [],
        'settings' => $user['settings'] ? json_decode($user['settings'], true) : ['theme' => 'dark', 'accentColor' => '#4f8fff']
    ];
    
    sendResponse([
        'success' => true,
        'user' => $_SESSION['user']
    ]);
}

function handleLogout() {
    session_destroy();
    sendResponse(['success' => true]);
}

function getSession() {
    if (isset($_SESSION['user'])) {
        sendResponse(['user' => $_SESSION['user']]);
    } else {
        sendError('Not authenticated', 401);
    }
}
?>