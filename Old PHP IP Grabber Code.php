<?php
// File to store IP addresses
$log_file = "ip_log.txt";

// Get the visitor's IP address
$visitor_ip = $_SERVER['REMOTE_ADDR'];

// Check for forwarded IPs (basic proxy handling, often ignored in old scripts)
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $visitor_ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
}

// Get the current timestamp
$timestamp = date("Y-m-d H:i:s");

// Log the IP to a file
$log_entry = "$timestamp - IP: $visitor_ip\n";
file_put_contents($log_file, $log_entry, FILE_APPEND);

// Display a simple webpage
?>
<!DOCTYPE html>
<html>
<head>
    <title>IP Grabber</title>
    <style>
        body {
            background-color: #000;
            color: #0f0;
            font-family: "Courier New", monospace;
            text-align: center;
            margin-top: 50px;
        }
        h1 {
            font-size: 36px;
            text-shadow: 0 0 10px #0f0;
        }
        p {
            font-size: 18px;
        }
    </style>
</head>
<body>
    <h1>IP Grabber 2000</h1>
    <p>We got your IP, dude!</p>
    <p>IP Address: <?php echo $visitor_ip; ?></p>
    <p>Check the logs for more visitors!</p>
</body>
</html>
