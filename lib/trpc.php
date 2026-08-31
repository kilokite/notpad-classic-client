<?php

class TrpcException extends RuntimeException
{
    private $details;

    public function __construct($message, $details = array(), $code = 0)
    {
        parent::__construct($message, $code);
        $this->details = $details;
    }

    public function getDetails()
    {
        return $this->details;
    }
}

function trpc_error_message($error)
{
    if (is_string($error) && trim($error) !== '') {
        return $error;
    }

    if (is_array($error)) {
        $candidates = array(
            isset($error['message']) ? $error['message'] : null,
            isset($error['json']['message']) ? $error['json']['message'] : null,
            isset($error['data']['message']) ? $error['data']['message'] : null,
            isset($error['json']['data']['message']) ? $error['json']['data']['message'] : null,
        );
        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return $candidate;
            }
        }

        $encoded = json_encode($error, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($encoded) && $encoded !== '') {
            return $encoded;
        }
    }

    return '业务服务器返回了未知错误';
}

function trpc_error_status($error, $fallback)
{
    $candidates = array();
    if (is_array($error)) {
        $candidates[] = isset($error['data']['httpStatus']) ? $error['data']['httpStatus'] : null;
        $candidates[] = isset($error['json']['data']['httpStatus']) ? $error['json']['data']['httpStatus'] : null;
    }
    $candidates[] = $fallback;

    foreach ($candidates as $candidate) {
        $status = (int) $candidate;
        if ($status >= 400 && $status <= 599) {
            return $status;
        }
    }
    return 500;
}

function trpc_call($procedure, $input = null, $isMutation = false, $token = '', $groupId = null)
{
    global $config;

    $base = rtrim($config['trpc_url'], '/');
    $url = $base . '/' . rawurlencode($procedure);
    $payload = json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        throw new TrpcException('无法序列化业务请求：' . json_last_error_msg());
    }
    $headers = array('Accept: application/json');

    if ($token !== '') {
        $headers[] = 'token: ' . str_replace(array("\r", "\n"), '', $token);
    }
    if ($groupId !== null && $groupId !== '') {
        $headers[] = 'x-group-id: ' . str_replace(array("\r", "\n"), '', $groupId);
    }

    $ch = curl_init();
    if ($isMutation) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    } else {
        $url .= '?input=' . rawurlencode($payload);
    }

    curl_setopt_array($ch, array(
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => isset($config['request_timeout']) ? (int) $config['request_timeout'] : 20,
        CURLOPT_USERAGENT => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'ClassicClient/1.0',
    ));

    $raw = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        throw new TrpcException('无法连接业务服务器：' . $curlError);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        $message = trim(strip_tags((string) $raw));
        throw new TrpcException($message !== '' ? $message : '业务服务器返回了空错误', array(
            'status' => $status,
            'raw' => $raw,
        ), $status >= 400 ? $status : 500);
    }

    if (isset($decoded['error'])) {
        $error = $decoded['error'];
        throw new TrpcException(
            trpc_error_message($error),
            $error,
            trpc_error_status($error, $status)
        );
    }

    if (!isset($decoded['result']['data'])) {
        throw new TrpcException(trpc_error_message($decoded), $decoded, $status >= 400 ? $status : 500);
    }

    $data = $decoded['result']['data'];
    return is_array($data) && array_key_exists('json', $data) ? $data['json'] : $data;
}

function trpc_query($procedure, $input = null, $token = '', $groupId = null)
{
    return trpc_call($procedure, $input, false, $token, $groupId);
}

function trpc_mutation($procedure, $input = null, $token = '', $groupId = null)
{
    return trpc_call($procedure, $input, true, $token, $groupId);
}
