<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

function checkAdmin() {
    if (!isset($_SESSION['user'])) {
        sendError('Not authenticated', 401);
    }
    if ($_SESSION['user']['role'] !== 'superadmin' && $_SESSION['user']['role'] !== 'admin') {
        sendError('Access denied', 403);
    }
    return $_SESSION['user'];
}

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getUser($_GET['id']);
        } else {
            getAllUsers();
        }
        break;
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'updateProfile') {
            updateProfile();
        } else {
            createUser();
        }
        break;
    case 'PUT':
        updateUser();
        break;
    case 'DELETE':
        deleteUser();
        break;
    default:
        sendError('Method not allowed', 405);
}

function getAllUsers() {
    checkAdmin();
    $conn = getConnection();
    $result = $conn->query("SELECT id, username, full_name, email, phone, photoURL, role, level, xp, created_at, settings FROM users ORDER BY created_at DESC");
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $row['settings'] = $row['settings'] ? json_decode($row['settings'], true) : null;
        $users[] = $row;
    }
    $conn->close();
    sendResponse(['users' => $users]);
}

function getUser($id) {
    $conn = getConnection();
    $stmt = $conn->prepare("SELECT id, username, full_name, email, phone, photoURL, role, level, xp, created_at, settings FROM users WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        $conn->close();
        sendError('User not found', 404);
    }
    $user = $result->fetch_assoc();
    $user['settings'] = $user['settings'] ? json_decode($user['settings'], true) : null;
    $conn->close();
    sendResponse(['user' => $user]);
}

function createUser() {
    checkAdmin();
    $input = getJsonInput();
    $fullName = $input['fullName'] ?? '';
    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $phone = $input['phone'] ?? '';
    $role = $input['role'] ?? 'user';

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

    $stmt = $conn->prepare("INSERT INTO users (id, username, password, full_name, email, phone, photoURL, role, level, xp, settings) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 1, 0, ?)");
    $stmt->bind_param("ssssssss", $userId, $username, $hashedPassword, $fullName, $email, $phone, $role, $settings);

    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true, 'userId' => $userId]);
    } else {
        $conn->close();
        sendError('Failed to create user', 500);
    }
}

function updateProfile() {
    if (!isset($_SESSION['user'])) {
        sendError('Not authenticated', 401);
    }
    $input = getJsonInput();
    $userId = $_SESSION['user']['id'];
    $conn = getConnection();

    $updates = [];
    $params = [];
    $types = "";

    if (isset($input['fullName'])) {
        $updates[] = "full_name = ?";
        $params[] = $input['fullName'];
        $types .= "s";
        $_SESSION['user']['fullName'] = $input['fullName'];
    }
    if (isset($input['email'])) {
        $updates[] = "email = ?";
        $params[] = $input['email'];
        $types .= "s";
        $_SESSION['user']['email'] = $input['email'];
    }
    if (isset($input['phone'])) {
        $updates[] = "phone = ?";
        $params[] = $input['phone'];
        $types .= "s";
        $_SESSION['user']['phone'] = $input['phone'];
    }

    // FIX: pakai array_key_exists agar null (hapus foto) juga diproses
    // isset() return false untuk null, jadi kalau user hapus foto tidak akan tersimpan
    if (array_key_exists('photoURL', $input)) {
        $updates[] = "photoURL = ?";
        $params[] = $input['photoURL'];  // bisa null atau string base64
        $types .= "s";
        $_SESSION['user']['photoURL'] = $input['photoURL'];
    }

    // FIX: support update settings (theme, accent, animations)
    if (isset($input['settings'])) {
        $updates[] = "settings = ?";
        $params[] = $input['settings']; // sudah JSON string dari JS
        $types .= "s";
        // Update session juga
        $_SESSION['user']['settings'] = json_decode($input['settings'], true);
    }

    if (isset($input['password']) && !empty($input['password'])) {
        if (strlen($input['password']) < 8) {
            $conn->close();
            sendError('Password must be at least 8 characters');
        }
        $updates[] = "password = ?";
        $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
        $types .= "s";
    }

    if (empty($updates)) {
        $conn->close();
        // Jika tidak ada yang diupdate, anggap sukses (settings mungkin tidak berubah)
        sendResponse(['success' => true, 'user' => $_SESSION['user']]);
    }

    $params[] = $userId;
    $types .= "s";

    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true, 'user' => $_SESSION['user']]);
    } else {
        $conn->close();
        sendError('Failed to update profile', 500);
    }
}

function updateUser() {
    $admin = checkAdmin();
    $input = getJsonInput();
    $id = $input['id'] ?? '';
    if (!$id) sendError('User ID required');

    $conn = getConnection();
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        $conn->close();
        sendError('User not found', 404);
    }
    $user = $result->fetch_assoc();
    if ($user['role'] === 'superadmin' && $admin['id'] !== $id) {
        $conn->close();
        sendError('Cannot modify superadmin', 403);
    }
    $stmt->close();

    $updates = [];
    $params = [];
    $types = "";

    if (isset($input['fullName'])) { $updates[] = "full_name = ?"; $params[] = $input['fullName']; $types .= "s"; }
    if (isset($input['username'])) { $updates[] = "username = ?"; $params[] = $input['username']; $types .= "s"; }
    if (isset($input['email'])) { $updates[] = "email = ?"; $params[] = $input['email']; $types .= "s"; }
    if (isset($input['phone'])) { $updates[] = "phone = ?"; $params[] = $input['phone']; $types .= "s"; }

    // FIX: array_key_exists untuk photoURL agar null (hapus foto) juga diproses
    if (array_key_exists('photoURL', $input)) {
        $updates[] = "photoURL = ?";
        $params[] = $input['photoURL'];
        $types .= "s";
    }

    if (isset($input['role'])) { $updates[] = "role = ?"; $params[] = $input['role']; $types .= "s"; }
    if (isset($input['password']) && !empty($input['password'])) {
        $updates[] = "password = ?";
        $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
        $types .= "s";
    }

    if (empty($updates)) {
        $conn->close();
        sendError('No fields to update');
    }

    $params[] = $id;
    $types .= "s";
    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true]);
    } else {
        $conn->close();
        sendError('Failed to update user', 500);
    }
}

function deleteUser() {
    checkAdmin();
    $id = $_GET['id'] ?? '';
    if (!$id) sendError('User ID required');

    $conn = getConnection();
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        $conn->close();
        sendError('User not found', 404);
    }
    $user = $result->fetch_assoc();
    if ($user['role'] === 'superadmin') {
        $conn->close();
        sendError('Cannot delete superadmin', 403);
    }
    $stmt->close();

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("s", $id);

    if ($stmt->execute()) {
        $conn->close();
        sendResponse(['success' => true]);
    } else {
        $conn->close();
        sendError('Failed to delete user', 500);
    }
}
?>
