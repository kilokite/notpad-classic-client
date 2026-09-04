<?php
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/page.php';
require __DIR__ . '/lib/markdown.php';
require_login();

$id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($id === '') {
    render_ssr_page('笔记预览', '<div class="ssr-panel"><h1>笔记预览</h1><p class="muted">缺少笔记编号。</p></div>');
}

$error = '';
$note = null;
$tags = array();

try {
    $note = trpc_query('notepad.getNoteById', array('id' => $id), current_token(), current_group_id());
    $tags = trpc_query('notepad.getNoteTags', array('note_id' => $id), current_token(), current_group_id());
} catch (Throwable $e) {
    handle_page_auth_error($e);
    $error = $e->getMessage();
}

ob_start();
?>
<div class="ssr-panel">
    <h1><?php echo $note ? h(isset($note['title']) ? $note['title'] : '未命名笔记') : '笔记预览'; ?></h1>
    <?php if ($error !== ''): ?>
        <p class="ssr-error"><?php echo h($error); ?></p>
    <?php else: ?>
        <div class="ssr-meta">
            建立时间：<?php echo h(format_datetime(isset($note['created_at']) ? $note['created_at'] : '')); ?>
            &nbsp;&nbsp;最后修改：<?php echo h(format_datetime(isset($note['updated_at']) ? $note['updated_at'] : '')); ?>
        </div>
        <?php if ($tags): ?>
            <div class="ssr-tags">
                标签：
                <?php foreach ($tags as $tag): ?>
                    <a class="ssr-tag" href="tag.php?type=note&amp;id=<?php echo h(isset($tag['id']) ? $tag['id'] : ''); ?>"><?php echo h(isset($tag['name']) ? $tag['name'] : ''); ?></a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <div class="ssr-content markdown-body"><?php echo render_markdown(isset($note['content']) ? $note['content'] : ''); ?></div>
    <?php endif; ?>
</div>
<?php
render_ssr_page($note && !empty($note['title']) ? $note['title'] : '笔记预览', ob_get_clean());
