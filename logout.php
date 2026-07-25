<?php
session_start();

if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

$_SESSION = [];
session_unset();
session_destroy();

header('Location: index.html');
exit;
