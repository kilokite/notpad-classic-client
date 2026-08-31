<?php
require __DIR__ . '/lib/bootstrap.php';
require_login();

$procedures = array(
    'timeline' => false,
    'auth.getProfile' => false,
    'auth.updateMeta' => true,
    'auth.updateProfile' => true,
    'auth.getTokens' => false,
    'auth.setTokenAlias' => true,
    'auth.revokeToken' => true,
    'notepad.getNotes' => false,
    'notepad.getNoteById' => false,
    'notepad.createNote' => true,
    'notepad.updateNote' => true,
    'notepad.deleteNote' => true,
    'notepad.listTags' => false,
    'notepad.createTag' => true,
    'notepad.deleteTag' => true,
    'notepad.getNoteTags' => false,
    'notepad.addTagToNote' => true,
    'notepad.removeTagFromNote' => true,
    'todo.listLists' => false,
    'todo.getList' => false,
    'todo.createList' => true,
    'todo.updateList' => true,
    'todo.deleteList' => true,
    'todo.createItem' => true,
    'todo.updateItem' => true,
    'todo.deleteItem' => true,
    'bookmark.list' => false,
    'bookmark.add' => true,
    'bookmark.remove' => true,
    'bookmark.fetchUrl' => false,
    'bookmark.getById' => false,
    'bookmark.listTags' => false,
    'bookmark.createTag' => true,
    'bookmark.deleteTag' => true,
    'bookmark.getBookmarkTags' => false,
    'bookmark.addTagToBookmark' => true,
    'bookmark.removeTagFromBookmark' => true,
    'image_bed.list' => false,
    'image_bed.rename' => true,
    'image_bed.listTags' => false,
    'image_bed.createTag' => true,
    'image_bed.deleteTag' => true,
    'image_bed.getImageTags' => false,
    'image_bed.addTagToImage' => true,
    'image_bed.removeTagFromImage' => true,
    'file_drive.list' => false,
    'file_drive.createFolder' => true,
    'file_drive.renameFile' => true,
    'file_drive.renameFolder' => true,
    'file_drive.getDownloadUrl' => false,
    'group.list' => false,
    'group.getById' => false,
    'group.create' => true,
    'group.update' => true,
    'group.delete' => true,
    'group.listMembers' => false,
    'group.inviteUser' => true,
    'group.createInviteLink' => true,
    'group.acceptInvite' => true,
    'group.getInviteInfo' => false,
    'group.listPendingInvites' => false,
    'group.listInviteCodes' => false,
    'group.myInvites' => false,
    'group.removeInvite' => true,
    'group.removeMember' => true,
    'group.updateMemberRole' => true,
    'group.leave' => true,
    'group.transferOwnership' => true,
    'groupChat.list' => false,
    'groupChat.send' => true,
    'setting.getAll' => false,
    'setting.set' => true,
    'setting.remove' => true,
    'setting.getUsageStats' => false,
    'setting.recalculateStats' => true,
);

$request = read_json_body();
$procedure = isset($request['procedure']) ? (string) $request['procedure'] : '';
$input = array_key_exists('input', $request) ? $request['input'] : null;

if ($procedure === 'session.setGroup') {
    $groupId = is_array($input) && isset($input['group_id']) ? trim((string) $input['group_id']) : '';
    if ($groupId !== '') {
        try {
            trpc_query('group.getById', $groupId, current_token(), null);
        } catch (Throwable $e) {
            json_response(array('success' => false, 'message' => '无法切换到该群组：' . $e->getMessage()), 403);
        }
    }
    $_SESSION['group_id'] = $groupId;
    json_response(array('success' => true, 'data' => array('group_id' => $groupId)));
}

if (!array_key_exists($procedure, $procedures)) {
    json_response(array('success' => false, 'message' => '不允许的操作'), 400);
}

try {
    $result = trpc_call($procedure, $input, $procedures[$procedure], current_token(), current_group_id());
    json_response(array('success' => true, 'data' => $result));
} catch (TrpcException $e) {
    if ($e->getCode() === 401) {
        $_SESSION = array();
    }
    json_response(array(
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getDetails(),
    ), $e->getCode() >= 400 ? $e->getCode() : 500);
} catch (Throwable $e) {
    json_response(array(
        'success' => false,
        'message' => $e->getMessage(),
        'error' => array(
            'type' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ),
    ), 500);
}
