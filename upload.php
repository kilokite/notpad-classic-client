<?php
require __DIR__ . '/lib/bootstrap.php';
require_login();

function upload_response($success, $message = '', $data = null)
{
    header('Content-Type: text/html; charset=utf-8');
    $payload = array('success' => $success, 'message' => $message, 'data' => $data);
    echo '<textarea>' . htmlspecialchars(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_NOQUOTES, 'UTF-8') . '</textarea>';
    exit;
}

if (!isset($_FILES['upload_file']) || $_FILES['upload_file']['error'] !== UPLOAD_ERR_OK) {
    upload_response(false, '请选择有效文件，或检查 PHP 上传大小限制。');
}

$kind = isset($_POST['kind']) ? $_POST['kind'] : '';
if ($kind !== 'image' && $kind !== 'file') {
    upload_response(false, '不支持的上传类型。');
}

$file = $_FILES['upload_file'];
$originalName = basename($file['name']);
$displayName = trim(isset($_POST['name']) ? $_POST['name'] : '');
if ($displayName === '') $displayName = $originalName;
$mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : $file['type'];
if (!$mime) $mime = 'application/octet-stream';

try {
    if ($kind === 'image' && strpos($mime, 'image/') !== 0) {
        throw new RuntimeException('所选文件不是可识别的图片。');
    }

    $input = $kind === 'image'
        ? array('filename' => $originalName, 'type' => $mime)
        : array('filename' => $originalName, 'type' => $mime, 'folder_id' => !empty($_POST['folder_id']) ? (string) $_POST['folder_id'] : null);
    $signed = trpc_query($kind === 'image' ? 'image_bed.getUploadUrl' : 'file_drive.getUploadUrl', $input, current_token(), current_group_id());

    if (empty($signed['url']) || empty($signed['filename'])) {
        throw new RuntimeException('业务服务器没有返回上传地址。');
    }

    $fp = fopen($file['tmp_name'], 'rb');
    if (!$fp) throw new RuntimeException('无法读取临时上传文件。');
    $ch = curl_init($signed['url']);
    curl_setopt_array($ch, array(
        CURLOPT_UPLOAD => true,
        CURLOPT_INFILE => $fp,
        CURLOPT_INFILESIZE => (int) $file['size'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array('Content-Type: ' . $mime),
        CURLOPT_TIMEOUT => 180,
    ));
    curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    fclose($fp);
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('对象存储上传失败（HTTP ' . $status . '）' . ($error ? '：' . $error : ''));
    }

    if ($kind === 'image') {
        $result = trpc_mutation('image_bed.addImage', array(
            'name' => $displayName,
            'filename' => $signed['filename'],
            'remark' => trim(isset($_POST['remark']) ? $_POST['remark'] : ''),
        ), current_token(), current_group_id());
    } else {
        $result = trpc_mutation('file_drive.addFile', array(
            'name' => $displayName,
            'filename' => $signed['filename'],
            'folder_id' => !empty($_POST['folder_id']) ? (string) $_POST['folder_id'] : null,
            'mime_type' => $mime,
        ), current_token(), current_group_id());
    }
    upload_response(true, '上传完成', $result);
} catch (Throwable $e) {
    upload_response(false, $e->getMessage());
}
