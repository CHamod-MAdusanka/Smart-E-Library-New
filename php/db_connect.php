<?php
// සර්වර් එකේ විස්තර
$servername = "localhost";
$username = "root";       // XAMPP එකේ default username එක
$password = "";           // XAMPP එකේ default password එක හිස්
$dbname = "smart_e_library"; // අපි හදපු ඩේටාබේස් එකේ නම

// දත්ත ගබඩාවට සම්බන්ධ වීම
$conn = new mysqli($servername, $username, $password, $dbname);

// සම්බන්ධතාවය හරිදැයි පරීක්ෂා කිරීම
if ($conn->connect_error) {
    die("Database Connection Failed: " . $conn->connect_error);
} else {
    // ටෙස්ට් කරන්න විතරක් මේක දාමු
    // echo "Database Successfully Connected....!"; 
}
?>