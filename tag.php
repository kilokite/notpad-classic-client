<?php
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/page.php';
require_login();

$typeMap = array(
    'note' => array('label' => '笔记标签', 'list' => 'notepad.listTags', 'prefix' => 'note'),
    'bookmark' => array('label' => '书签标签', 'list' => 'bookmark.listTags', 'prefix' => 'bookmark'),
    'image' => array('label' => '图片标签', 'list' => 'image_bed.listTags', 'prefix' => 'image'),
);

$type = isset($_GET['type']) ? (string) $_GET['type'] : 'note';
if (!isset($typeMap[$type])) {
    $type = 'note';
}

$tagId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$page = isset($_GET['page']) ? max(0, (int) $_GET['page']) : 0;
$pageSize = 30;
$spec = $typeMap[$type];

$error = '';
$tags = array();
$tag = null;
$items = array();

try {
    $tags = trpc_query($spec['list'], null, current_token(), current_group_id());
    if (!is_array($tags)) {
        $tags = array();
    }
    if ($tagId > 0) {
        $tag = find_tag_by_id($tags, $tagId);
        if (!$tag) {
            $error = '标签不存在。';
        } elseif ($type === 'note') {
            $items = trpc_query('notepad.getNotes', array('page' => $page, 'tag_id' => $tagId), current_token(), current_group_id());
        } elseif ($type === 'bookmark') {
            $items = trpc_query('bookmark.list', array(
                'offset' => $page,
                'sort' => 'time_desc',
                'search' => '',
                'type' => null,
                'tag_id' => $tagId,
            ), current_token(), current_group_id());
        } else {
            $profile = trpc_query('auth.getProfile', null, current_token(), current_group_id());
            $items = trpc_query('image_bed.list', array(
                'user_id' => isset($profile['id']) ? (string) $profile['id'] : '',
                'offset' => $page,
                'sort' => 'time_desc',
                'search' => '',
                'tag_id' => $tagId,
            ), current_token(), current_group_id());
        }
        if (!is_array($items)) {
            $items = array();
        }
    }
} catch (Throwable $e) {
    handle_page_auth_error($e);
    $error = $e->getMessage();
}

$title = $tag ? $spec['label'] . '：' . $tag['name'] : $spec['label'];
$prevPage = $page > 0 ? $page - 1 : null;
$nextPage = count($items) >= $pageSize ? $page + 1 : null;

ob_start();
?>
<div class="ssr-panel">
    <h1><?php echo h($title); ?></h1>
    <div class="ssr-meta">
        <a href="tag.php?type=note">笔记标签</a>
        &nbsp;|&nbsp;
        <a href="tag.php?type=bookmark">书签标签</a>
        &nbsp;|&nbsp;
        <a href="tag.php?type=image">图片标签</a>
        <?php if ($tagId > 0): ?>
            &nbsp;|&nbsp;<a href="tag.php?type=<?php echo h($type); ?>">返回标签列表</a>
        <?php endif; ?>
    </div>

    <?php if ($error !== ''): ?>
        <p class="ssr-error"><?php echo h($error); ?></p>
    <?php elseif ($tagId <= 0): ?>
        <?php if (!$tags): ?>
            <p class="muted">暂无标签。</p>
        <?php else: ?>
            <table class="ssr-table">
                <tr><th>编号</th><th>标签名称</th></tr>
                <?php foreach ($tags as $row): ?>
                    <tr>
                        <td><?php echo h(isset($row['id']) ? $row['id'] : ''); ?></td>
                        <td><a href="tag.php?type=<?php echo h($type); ?>&amp;id=<?php echo h(isset($row['id']) ? $row['id'] : ''); ?>"><?php echo h(isset($row['name']) ? $row['name'] : ''); ?></a></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        <?php endif; ?>
    <?php elseif ($type === 'note'): ?>
        <?php if (!$items): ?>
            <p class="muted">该标签下暂无笔记。</p>
        <?php else: ?>
            <table class="ssr-table">
                <tr><th>标题</th><th>最后修改</th></tr>
                <?php foreach ($items as $row): ?>
                    <tr>
                        <td><a href="note.php?id=<?php echo h(isset($row['id']) ? $row['id'] : ''); ?>"><?php echo h(isset($row['title']) && $row['title'] !== '' ? $row['title'] : '未命名笔记'); ?></a></td>
                        <td><?php echo h(format_datetime(isset($row['updated_at']) ? $row['updated_at'] : '')); ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        <?php endif; ?>
    <?php elseif ($type === 'bookmark'): ?>
        <?php if (!$items): ?>
            <p class="muted">该标签下暂无书签。</p>
        <?php else: ?>
            <table class="ssr-table">
                <tr><th>标题</th><th>地址/引用</th><th>收藏时间</th></tr>
                <?php foreach ($items as $row): ?>
                    <tr>
                        <td><?php echo h(isset($row['title']) ? $row['title'] : ''); ?></td>
                        <td>
                            <?php if (!empty($row['url'])): ?>
                                <a href="<?php echo h($row['url']); ?>" target="_blank" rel="noreferrer"><?php echo h($row['url']); ?></a>
                            <?php else: ?>
                                <?php echo h(isset($row['ref_id']) ? $row['ref_id'] : ''); ?>
                            <?php endif; ?>
                        </td>
                        <td><?php echo h(format_datetime(isset($row['created_at']) ? $row['created_at'] : '')); ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        <?php endif; ?>
    <?php else: ?>
        <?php if (!$items): ?>
            <p class="muted">该标签下暂无图片。</p>
        <?php else: ?>
            <div class="ssr-thumbs">
                <?php foreach ($items as $row): ?>
                    <?php
                    $full = public_asset_url(isset($row['url']) ? $row['url'] : '');
                    $thumb = public_thumb_url(isset($row['url']) ? $row['url'] : '', 240);
                    ?>
                    <div class="ssr-thumb">
                        <?php if ($thumb !== ''): ?>
                            <a href="<?php echo h($full); ?>" target="_blank" rel="noreferrer"><img src="<?php echo h($thumb); ?>" alt="<?php echo h(isset($row['name']) ? $row['name'] : ''); ?>"></a>
                        <?php endif; ?>
                        <div><?php echo h(isset($row['name']) ? $row['name'] : ''); ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    <?php endif; ?>

    <?php if ($tagId > 0 && ($prevPage !== null || $nextPage !== null)): ?>
        <div class="ssr-pager">
            <?php if ($prevPage !== null): ?>
                <a href="tag.php?type=<?php echo h($type); ?>&amp;id=<?php echo h($tagId); ?>&amp;page=<?php echo h($prevPage); ?>">上一页</a>
            <?php endif; ?>
            第 <?php echo h($page + 1); ?> 页
            <?php if ($nextPage !== null): ?>
                <a href="tag.php?type=<?php echo h($type); ?>&amp;id=<?php echo h($tagId); ?>&amp;page=<?php echo h($nextPage); ?>">下一页</a>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</div>
<?php
render_ssr_page($title, ob_get_clean());
