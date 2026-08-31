<?php

return array(
    'trpc_url' => getenv('TRPC_URL') ?: 'http://127.0.0.1:4000/trpc',
    'asset_base_url' => getenv('ASSET_BASE_URL') ?: '',
    'app_name' => 'Note',
    'session_name' => 'classic_notepad',
    'timezone' => 'Asia/Shanghai',
    'request_timeout' => 20,
);
