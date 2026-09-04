<?php

function markdown_escape($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

function markdown_safe_url($url)
{
    $url = trim((string) $url);
    if ($url === '') {
        return '';
    }
    if (preg_match('#^(?:https?:|mailto:|/)#i', $url) || !preg_match('#^[a-z][a-z0-9+.-]*:#i', $url)) {
        if (preg_match('#^(?:javascript|vbscript|data):#i', $url)) {
            return '';
        }
        return $url;
    }
    return '';
}

function markdown_rewrite_url($url)
{
    $safe = markdown_safe_url($url);
    if ($safe === '') {
        return '';
    }
    if (function_exists('public_asset_url') && !preg_match('#^(?:https?:|mailto:|/)#i', $safe)) {
        return public_asset_url($safe);
    }
    return $safe;
}

function markdown_inline($text)
{
    $out = '';
    $len = strlen($text);
    $i = 0;
    while ($i < $len) {
        if ($text[$i] === '`' ) {
            $end = strpos($text, '`', $i + 1);
            if ($end !== false) {
                $out .= '<code>' . markdown_escape(substr($text, $i + 1, $end - $i - 1)) . '</code>';
                $i = $end + 1;
                continue;
            }
        }

        if ($text[$i] === '!' && $i + 1 < $len && $text[$i + 1] === '[') {
            if (preg_match('/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/', substr($text, $i), $m)) {
                $src = markdown_rewrite_url($m[2]);
                if ($src !== '') {
                    $alt = markdown_escape($m[1]);
                    $title = isset($m[3]) ? ' title="' . markdown_escape($m[3]) . '"' : '';
                    $out .= '<img src="' . markdown_escape($src) . '" alt="' . $alt . '"' . $title . '>';
                }
                $i += strlen($m[0]);
                continue;
            }
        }

        if ($text[$i] === '[') {
            if (preg_match('/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/', substr($text, $i), $m)) {
                $href = markdown_rewrite_url($m[2]);
                if ($href !== '') {
                    $title = isset($m[3]) ? ' title="' . markdown_escape($m[3]) . '"' : '';
                    $out .= '<a href="' . markdown_escape($href) . '"' . $title . ' target="_blank" rel="noreferrer">' . markdown_inline($m[1]) . '</a>';
                } else {
                    $out .= markdown_escape($m[0]);
                }
                $i += strlen($m[0]);
                continue;
            }
        }

        if (substr($text, $i, 2) === '**' || substr($text, $i, 2) === '__') {
            $mark = substr($text, $i, 2);
            $end = strpos($text, $mark, $i + 2);
            if ($end !== false) {
                $out .= '<strong>' . markdown_inline(substr($text, $i + 2, $end - $i - 2)) . '</strong>';
                $i = $end + 2;
                continue;
            }
        }

        if (substr($text, $i, 2) === '~~') {
            $end = strpos($text, '~~', $i + 2);
            if ($end !== false) {
                $out .= '<del>' . markdown_inline(substr($text, $i + 2, $end - $i - 2)) . '</del>';
                $i = $end + 2;
                continue;
            }
        }

        if (($text[$i] === '*' || $text[$i] === '_') && ($i === 0 || !ctype_alnum($text[$i - 1]))) {
            $mark = $text[$i];
            $end = strpos($text, $mark, $i + 1);
            if ($end !== false && ($end + 1 >= $len || !ctype_alnum($text[$end + 1]))) {
                $out .= '<em>' . markdown_inline(substr($text, $i + 1, $end - $i - 1)) . '</em>';
                $i = $end + 1;
                continue;
            }
        }

        $out .= markdown_escape($text[$i]);
        $i++;
    }
    return $out;
}

function render_markdown($text)
{
    $text = str_replace(array("\r\n", "\r"), "\n", (string) $text);
    $lines = explode("\n", $text);
    $html = array();
    $para = array();
    $list = null;
    $quote = array();
    $i = 0;
    $count = count($lines);

    $flushPara = function () use (&$para, &$html) {
        if ($para) {
            $html[] = '<p>' . markdown_inline(trim(implode("\n", $para))) . '</p>';
            $para = array();
        }
    };
    $flushList = function () use (&$list, &$html) {
        if ($list) {
            $html[] = '<' . $list['tag'] . '><li>' . implode('</li><li>', $list['items']) . '</li></' . $list['tag'] . '>';
            $list = null;
        }
    };
    $flushQuote = function () use (&$quote, &$html) {
        if ($quote) {
            $html[] = '<blockquote>' . render_markdown(implode("\n", $quote)) . '</blockquote>';
            $quote = array();
        }
    };

    while ($i < $count) {
        $line = $lines[$i];
        $trim = rtrim($line);

        if (preg_match('/^```([\w-]+)?\s*$/', $trim, $m)) {
            $flushPara();
            $flushList();
            $flushQuote();
            $lang = isset($m[1]) ? $m[1] : '';
            $code = array();
            $i++;
            while ($i < $count && !preg_match('/^```\s*$/', rtrim($lines[$i]))) {
                $code[] = $lines[$i];
                $i++;
            }
            $cls = $lang !== '' ? ' class="language-' . markdown_escape($lang) . '"' : '';
            $html[] = '<pre><code' . $cls . '>' . markdown_escape(implode("\n", $code)) . '</code></pre>';
            $i++;
            continue;
        }

        if ($trim === '') {
            $flushPara();
            $flushList();
            $flushQuote();
            $i++;
            continue;
        }

        if (preg_match('/^>\s?(.*)$/', $trim, $m)) {
            $flushPara();
            $flushList();
            $quote[] = $m[1];
            $i++;
            continue;
        }
        $flushQuote();

        if (preg_match('/^\s*([-*_])\s*\1\s*\1[\s\1]*$/', $trim)) {
            $flushPara();
            $flushList();
            $html[] = '<hr>';
            $i++;
            continue;
        }

        if (preg_match('/^(#{1,6})\s+(.+)$/', $trim, $m)) {
            $flushPara();
            $flushList();
            $level = strlen($m[1]);
            $html[] = '<h' . $level . '>' . markdown_inline($m[2]) . '</h' . $level . '>';
            $i++;
            continue;
        }

        if (preg_match('/^\s*([-*+])\s+(.+)$/', $trim, $m)) {
            $flushPara();
            if (!$list || $list['tag'] !== 'ul') {
                $flushList();
                $list = array('tag' => 'ul', 'items' => array());
            }
            $list['items'][] = markdown_inline($m[2]);
            $i++;
            continue;
        }

        if (preg_match('/^\s*(\d+)\.\s+(.+)$/', $trim, $m)) {
            $flushPara();
            if (!$list || $list['tag'] !== 'ol') {
                $flushList();
                $list = array('tag' => 'ol', 'items' => array());
            }
            $list['items'][] = markdown_inline($m[2]);
            $i++;
            continue;
        }

        if (preg_match('/^\|(.+)\|$/', $trim) && $i + 1 < $count && preg_match('/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/', $lines[$i + 1])) {
            $flushPara();
            $flushList();
            $header = array_map('trim', explode('|', trim($trim, '|')));
            $i += 2;
            $rows = array();
            while ($i < $count && preg_match('/^\|(.+)\|$/', rtrim($lines[$i]))) {
                $rows[] = array_map('trim', explode('|', trim(rtrim($lines[$i]), '|')));
                $i++;
            }
            $table = '<table class="md-table"><thead><tr>';
            foreach ($header as $cell) {
                $table .= '<th>' . markdown_inline($cell) . '</th>';
            }
            $table .= '</tr></thead><tbody>';
            foreach ($rows as $row) {
                $table .= '<tr>';
                foreach ($row as $cell) {
                    $table .= '<td>' . markdown_inline($cell) . '</td>';
                }
                $table .= '</tr>';
            }
            $table .= '</tbody></table>';
            $html[] = $table;
            continue;
        }

        $flushList();
        $para[] = $trim;
        $i++;
    }

    $flushQuote();
    $flushList();
    $flushPara();

    return implode("\n", $html);
}
