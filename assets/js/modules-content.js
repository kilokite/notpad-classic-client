(function () {
  function pagingText(page, count) {
    return count
      ? "当前显示第 " + (page * 30 + 1) + " 至 " + (page * 30 + count) + " 条"
      : "当前页没有记录";
  }

  Classic.modules.dashboard = function () {
    var stats = Classic.boot.stats || {};
    function stat(key) {
      return stats[key] === undefined || stats[key] === null ? 0 : stats[key];
    }
    var inviteCount = Ext.isArray(Classic.boot.invites)
      ? Classic.boot.invites.length
      : 0;
    var html = [
      '<div class="dashboard-wrap"><table class="dashboard-table"><tr>',
      '<td width="34%"><div class="dashboard-section"><h3><img src="assets/icons/chart.png">资料统计</h3><div class="dashboard-section-body">',
      '<div class="stat-line"><img src="assets/icons/notebook.png">笔记总数<strong>' +
        Classic.html(stat("notes_count")) +
        "</strong></div>",
      '<div class="stat-line"><img src="assets/icons/bookmark.png">书签总数<strong>' +
        Classic.html(stat("bookmarks_count")) +
        "</strong></div>",
      '<div class="stat-line"><img src="assets/icons/image.png">图片数量<strong>' +
        Classic.html(stat("images_count")) +
        "</strong></div>",
      '<div class="stat-line"><img src="assets/icons/document.png">文件数量<strong>' +
        Classic.html(stat("files_count")) +
        "</strong></div>",
      '<div class="stat-line stat-line-last"><img src="assets/icons/drive.png">占用空间<strong>' +
        Classic.bytes(
          Number(stat("images_size")) + Number(stat("files_size")),
        ) +
        "</strong></div>",
      "</div></div></td>",
      '<td width="33%"><div class="dashboard-section"><h3><img src="assets/icons/lightning.png">常用操作</h3><div class="dashboard-section-body">',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'notes\');return false"><img src="assets/icons/notebook--plus.png">新建笔记</a>',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'todo\');return false"><img src="assets/icons/tick.png">查看待办</a>',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'bookmarks\');return false"><img src="assets/icons/bookmark--plus.png">添加书签</a>',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'files\');return false"><img src="assets/icons/upload.png">上传文件</a>',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'groups\');return false"><img src="assets/icons/users.png">群组管理</a>',
      '<a class="quick-link" href="#" onclick="Classic.openModule(\'profile\');return false"><img src="assets/icons/user--pencil.png">个人资料</a>',
      "</div></div></td>",
      '<td><div class="dashboard-section"><h3><img src="assets/icons/information.png">系统信息</h3><div class="dashboard-section-body">',
      '<div class="info-line"><img src="assets/icons/calendar-day.png">当前日期：' +
        Classic.html(Classic.boot.today) +
        "</div>",
      '<div class="info-line"><img src="assets/icons/user.png">当前用户：' +
        Classic.html(
          (Classic.boot.profile || {}).name || (Classic.boot.profile || {}).id,
        ) +
        "</div>",
      '<div class="info-line"><img src="assets/icons/mail.png">待处理群组邀请：<strong>' +
        inviteCount +
        "</strong> 项</div>",
      '<div class="info-line"><img src="assets/icons/home.png">当前工作区：<span id="dashboard-workspace">' +
        (Classic.activeGroupId ? "群组资料" : "个人资料") +
        "</span></div>",
      "</div></div></td></tr><tr>",
      '<td colspan="3"><div class="dashboard-section"><h3><img src="assets/icons/clock.png">最近动态</h3><div id="timeline-box" class="dashboard-section-body">正在读取最近动态...</div></div></td>',
      "</tr></table></div>",
    ].join("");
    var panel = new Ext.Panel({
      title: "管理首页",
      iconCls: "icon-home",
      autoScroll: true,
      html: html,
    });
    panel.reloadModule = function () {
      Classic.api("setting.getUsageStats", null, function (data) {
        Classic.boot.stats = data || {};
      });
      Classic.api(
        "timeline",
        0,
        function (rows) {
          var box = Ext.get("timeline-box");
          if (!box) return;
          if (!Ext.isArray(rows) || rows.length === 0) {
            box.update('<span class="muted">暂无动态记录。</span>');
            return;
          }
          var list = ['<ul class="notice-list">'];
          Ext.each(rows, function (row) {
            list.push(
              "<li>" +
                Classic.html(
                  row.title || row.name || row.action || row.type || "资料更新",
                ) +
                ' <span class="muted">' +
                Classic.html(Classic.date(row.created_at || row.time)) +
                "</span></li>",
            );
          });
          list.push("</ul>");
          box.update(list.join(""));
        },
        { silent: true },
      );
    };
    panel.on("afterrender", panel.reloadModule, panel, { single: true });
    return panel;
  };

  Classic.modules.notes = function () {
    var page = 0,
      pageSize = 30;
    var store = Classic.arrayStore([
      "id",
      "title",
      "content",
      "created_at",
      "updated_at",
    ]);
    var search = new Ext.form.TextField({
      width: 160,
      emptyText: "在当前页查找...",
    });
    var tagFilter = Classic.tagFilterCombo("notepad", function () {
      page = 0;
      load();
    });
    var grid = new Ext.grid.GridPanel({
      title: "笔记管理",
      iconCls: "icon-note",
      store: store,
      stripeRows: true,
      columns: [
        {
          header: "标题",
          dataIndex: "title",
          width: 300,
          renderer: function (v) {
            return (
              '<span class="grid-link">' +
              Classic.html(v || "未命名笔记") +
              "</span>"
            );
          },
        },
        {
          header: "建立时间",
          dataIndex: "created_at",
          width: 145,
          renderer: Classic.date,
        },
        {
          header: "最后修改",
          dataIndex: "updated_at",
          width: 145,
          renderer: Classic.date,
        },
        Classic.actionColumn(
          [
            { act: "preview", text: "预览" },
            { act: "edit", text: "修改" },
            { act: "tags", text: "标签" },
            { act: "remove", text: "删除" },
          ],
          230,
        ),
      ],
      viewConfig: { forceFit: true, emptyText: "暂无笔记记录" },
      tbar: [
        {
          text: "新建笔记",
          iconCls: "icon-add",
          handler: function () {
            editNote();
          },
        },
        {
          text: "标签管理",
          iconCls: "icon-tag",
          handler: function () {
            Classic.simpleTagManager({
              prefix: "notepad",
              title: "笔记标签管理",
              onPreview: function (tag) {
                Classic.openTagPreview("note", tag);
              },
              onClose: function () {
                tagFilter.reloadTags();
              },
            });
          },
        },
        "->",
        tagFilter,
        search,
        {
          text: "查找",
          iconCls: "icon-search",
          handler: function () {
            store.filter("title", search.getValue(), true, false);
          },
        },
      ],
      bbar: [
        {
          text: "上一页",
          iconCls: "icon-prev",
          handler: function () {
            if (page > 0) {
              page--;
              load();
            }
          },
        },
        {
          text: "下一页",
          iconCls: "icon-next",
          handler: function () {
            if (store.getCount() >= pageSize) {
              page++;
              load();
            }
          },
        },
        "-",
        { xtype: "tbtext", id: Ext.id(null, "note-page-") },
      ],
    });
    Classic.bindRowActions(
      grid,
      {
        preview: showNote,
        edit: editNote,
        tags: assignTags,
        remove: removeNote,
      },
      showNote,
    );
    function load() {
      Classic.api(
        "notepad.getNotes",
        { page: page, tag_id: tagFilter.getTagId() },
        function (data) {
        Classic.loadArray(store, data);
        var item = grid.getBottomToolbar().items.itemAt(3);
        if (item)
          item.setText(
            "第 " + (page + 1) + " 页，共 " + store.getCount() + " 条",
          );
      });
    }
    function showNote(record) {
      var tabId = "page-note-" + record.id;
      Classic.api("notepad.renderNote", { id: String(record.id) }, function (data) {
        Classic.openPage(
          tabId,
          data.title || "笔记预览",
          "icon-note",
          [
            '<div class="preview-page">',
            "<h2>" + Classic.html(data.title || "未命名笔记") + "</h2>",
            '<div class="preview-page-meta">建立：' +
              Classic.html(Classic.date(data.created_at)) +
              "　修改：" +
              Classic.html(Classic.date(data.updated_at)) +
              "</div>",
            '<div class="preview-page-tags">' +
              Classic.tagChips(data.tags || []) +
              "</div>",
            '<div class="preview-page-body markdown-body">' +
              (data.html || "") +
              "</div>",
            "</div>",
          ].join(""),
        );
      });
    }
    function editNote(record) {
      if (record) {
        Classic.api(
          "notepad.getNoteById",
          { id: String(record.id) },
          function (data) {
            openNoteEditor(data, record);
          },
        );
      } else {
        openNoteEditor(null, null);
      }
    }
    function openNoteEditor(data, record) {
      Classic.windowForm({
        title: record ? "修改笔记" : "新建笔记",
        width: 650,
        height: 470,
        items: [
          {
            xtype: "textfield",
            fieldLabel: "笔记标题",
            name: "title",
            allowBlank: false,
            value: data ? data.title : "",
          },
          {
            xtype: "textarea",
            fieldLabel: "正文内容",
            name: "content",
            height: 350,
            value: data ? data.content : "",
          },
        ],
        onSave: function (values, win) {
          var procedure = record ? "notepad.updateNote" : "notepad.createNote";
          if (record) values.id = String(record.id);
          Classic.api(procedure, values, function () {
            win.close();
            load();
          });
        },
      });
    }
    function removeNote(record) {
      if (!record) return;
      Classic.confirm(
        "确定删除笔记“" +
          Classic.html(record.get("title")) +
          "”吗？此操作不可恢复。",
        function () {
          Classic.api(
            "notepad.deleteNote",
            { id: String(record.id) },
            function () {
              load();
            },
          );
        },
      );
    }
    function assignTags(record) {
      if (!record) return;
      Classic.api("notepad.listTags", null, function (tags) {
        Classic.api(
          "notepad.getNoteTags",
          { note_id: String(record.id) },
          function (selected) {
            var selectedIds = {},
              checks = [];
            Ext.each(selected || [], function (tag) {
              selectedIds[String(tag.id)] = true;
            });
            Ext.each(tags || [], function (tag) {
              checks.push({
                boxLabel: tag.name,
                name: "tag_" + tag.id,
                tagId: tag.id,
                checked: !!selectedIds[String(tag.id)],
              });
            });
            var original = selectedIds;
            Classic.windowForm({
              title: "设置笔记标签",
              width: 390,
              items: checks.length
                ? [
                    {
                      xtype: "checkboxgroup",
                      fieldLabel: "标签",
                      columns: 2,
                      items: checks,
                    },
                  ]
                : [
                    {
                      xtype: "displayfield",
                      hideLabel: true,
                      value: '<span class="muted">暂无标签，请先在标签管理中创建。</span>',
                    },
                  ],
              onSave: function (values, win, form) {
                var pending = 0,
                  complete = function () {
                    pending--;
                    if (pending <= 0) {
                      win.close();
                      load();
                    }
                  };
                Ext.each(tags || [], function (tag) {
                  var checked = !!form
                    .getForm()
                    .findField("tag_" + tag.id)
                    .getValue();
                  if (checked !== !!original[String(tag.id)]) {
                    pending++;
                    Classic.api(
                      checked
                        ? "notepad.addTagToNote"
                        : "notepad.removeTagFromNote",
                      { note_id: String(record.id), tag_id: Number(tag.id) },
                      complete,
                    );
                  }
                });
                if (!pending) win.close();
              },
            });
          },
        );
      });
    }
    grid.reloadModule = load;
    grid.on("afterrender", load, grid, { single: true });
    return grid;
  };

  Classic.modules.todo = function () {
    var listStore = Classic.arrayStore(["id", "name", "color", "sort_order"]);
    var itemStore = Classic.arrayStore([
      "id",
      "list_id",
      "title",
      "description",
      "done",
      "color",
      "refs",
      "sort_order",
      "created_at",
    ]);
    var listGrid = new Ext.grid.GridPanel({
      region: "west",
      width: 230,
      split: true,
      title: "待办列表",
      store: listStore,
      stripeRows: true,
      columns: [
        {
          header: "列表名称",
          dataIndex: "name",
          width: 170,
          renderer: function (v, m, r) {
            return (
              '<span class="color-chip" style="background:' +
              Classic.html(r.get("color") || "#999") +
              '"></span>' +
              Classic.html(v)
            );
          },
        },
        Classic.actionColumn(
          [
            { act: "edit", text: "修改" },
            { act: "remove", text: "删除" },
          ],
          120,
        ),
      ],
      viewConfig: { forceFit: true, emptyText: "暂无列表" },
      tbar: [
        {
          text: "新建",
          iconCls: "icon-add",
          handler: function () {
            editList();
          },
        },
      ],
      listeners: {
        rowclick: function (g, index) {
          loadItems(g.store.getAt(index));
        },
      },
    });
    Classic.bindRowActions(listGrid, {
      edit: editList,
      remove: deleteList,
    });
    var itemGrid = new Ext.grid.GridPanel({
      region: "center",
      title: "待办事项",
      store: itemStore,
      stripeRows: true,
      columns: [
        {
          header: "完成",
          dataIndex: "done",
          width: 48,
          renderer: function (v) {
            return Number(v)
              ? '<span class="status-ok">是</span>'
              : '<span class="status-no">否</span>';
          },
        },
        {
          header: "事项",
          dataIndex: "title",
          width: 310,
          renderer: function (v, m, r) {
            return Number(r.get("done"))
              ? '<span style="text-decoration:line-through;color:#888">' +
                  Classic.html(v) +
                  "</span>"
              : Classic.html(v);
          },
        },
        {
          header: "说明",
          dataIndex: "description",
          width: 300,
          renderer: Classic.html,
        },
        {
          header: "引用",
          dataIndex: "refs",
          width: 60,
          renderer: function (v) {
            return Ext.isArray(v) ? v.length : 0;
          },
        },
        Classic.actionColumn(
          [
            { act: "edit", text: "修改" },
            { act: "toggle", text: "完成/恢复" },
            { act: "remove", text: "删除" },
          ],
          200,
        ),
      ],
      viewConfig: { forceFit: true, emptyText: "请选择列表或新建待办" },
      tbar: [
        {
          text: "新建事项",
          iconCls: "icon-add",
          handler: function () {
            editItem();
          },
        },
        {
          text: "刷新",
          iconCls: "icon-refresh",
          handler: function () {
            var r = listGrid.getSelectionModel().getSelected();
            if (r) loadItems(r);
          },
        },
      ],
    });
    Classic.bindRowActions(
      itemGrid,
      {
        edit: editItem,
        toggle: toggleItem,
        remove: deleteItem,
      },
      editItem,
    );
    var panel = new Ext.Panel({
      title: "待办事项",
      iconCls: "icon-todo",
      layout: "border",
      items: [listGrid, itemGrid],
    });
    function loadLists() {
      Classic.api("todo.listLists", null, function (data) {
        Classic.loadArray(listStore, data);
        if (listStore.getCount()) {
          listGrid.getSelectionModel().selectFirstRow();
          loadItems(listStore.getAt(0));
        }
      });
    }
    function loadItems(list) {
      Classic.api("todo.getList", String(list.id), function (data) {
        itemGrid.setTitle(
          "待办事项 - " + Classic.html(data.name || list.get("name")),
        );
        Classic.loadArray(itemStore, data.items || []);
      });
    }
    function editList(record) {
      Classic.windowForm({
        title: record ? "修改列表" : "新建列表",
        width: 380,
        items: [
          {
            xtype: "textfield",
            fieldLabel: "列表名称",
            name: "name",
            allowBlank: false,
            value: record ? record.get("name") : "",
          },
          {
            xtype: "textfield",
            fieldLabel: "标识颜色",
            name: "color",
            value: record ? record.get("color") : "#9e9e9e",
          },
        ],
        onSave: function (values, win) {
          if (record) values.id = String(record.id);
          Classic.api(
            record ? "todo.updateList" : "todo.createList",
            values,
            function () {
              win.close();
              loadLists();
            },
          );
        },
      });
    }
    function deleteList(r) {
      if (!r) return;
      Classic.confirm(
        "删除列表将一并删除其中的待办事项，是否继续？",
        function () {
          Classic.api("todo.deleteList", String(r.id), loadLists);
        },
      );
    }
    function editItem(record) {
      var list = listGrid.getSelectionModel().getSelected();
      if (!list) {
        Ext.Msg.alert("提示", "请先选择一个待办列表。");
        return;
      }
      Classic.windowForm({
        title: record ? "修改待办事项" : "新建待办事项",
        width: 520,
        items: [
          {
            xtype: "textfield",
            fieldLabel: "事项标题",
            name: "title",
            allowBlank: false,
            value: record ? record.get("title") : "",
          },
          {
            xtype: "textarea",
            fieldLabel: "详细说明",
            name: "description",
            height: 120,
            value: record ? record.get("description") : "",
          },
          {
            xtype: "textfield",
            fieldLabel: "标识颜色",
            name: "color",
            value: record ? record.get("color") || "" : "",
          },
        ],
        onSave: function (values, win) {
          if (values.color === "") values.color = null;
          if (record) values.id = String(record.id);
          else {
            values.listId = String(list.id);
            values.refs = [];
          }
          Classic.api(
            record ? "todo.updateItem" : "todo.createItem",
            values,
            function () {
              win.close();
              loadItems(list);
            },
          );
        },
      });
    }
    function toggleItem(r) {
      if (!r) return;
      var list = listGrid.getSelectionModel().getSelected();
      Classic.api(
        "todo.updateItem",
        { id: String(r.id), done: Number(r.get("done")) ? 0 : 1 },
        function () {
          loadItems(list);
        },
      );
    }
    function deleteItem(r) {
      if (!r) return;
      var list = listGrid.getSelectionModel().getSelected();
      Classic.confirm("确定删除该待办事项吗？", function () {
        Classic.api("todo.deleteItem", String(r.id), function () {
          loadItems(list);
        });
      });
    }
    panel.reloadModule = loadLists;
    panel.on("afterrender", loadLists, panel, { single: true });
    return panel;
  };

  Classic.modules.bookmarks = function () {
    var offset = 0,
      pageSize = 30;
    var store = Classic.arrayStore([
      "id",
      "type",
      "title",
      "description",
      "content",
      "url",
      "ref_id",
      "created_at",
      "updated_at",
    ]);
    var search = new Ext.form.TextField({
      width: 170,
      emptyText: "标题或地址",
    });
    var type = new Ext.form.ComboBox({
      width: 95,
      mode: "local",
      triggerAction: "all",
      editable: false,
      value: "",
      store: [
        ["", "全部类型"],
        ["url", "网页"],
        ["note", "笔记"],
        ["image", "图片"],
        ["file", "文件"],
      ],
    });
    var tagFilter = Classic.tagFilterCombo("bookmark", function () {
      offset = 0;
      load();
    });
    var grid = new Ext.grid.GridPanel({
      title: "书签列表",
      store: store,
      stripeRows: true,
      columns: [
        {
          header: "类型",
          dataIndex: "type",
          width: 65,
          renderer: function (v) {
            return (
              { url: "网页", note: "笔记", image: "图片", file: "文件" }[v] || v
            );
          },
        },
        {
          header: "标题",
          dataIndex: "title",
          width: 260,
          renderer: function (v) {
            return '<span class="grid-link">' + Classic.html(v) + "</span>";
          },
        },
        {
          header: "说明",
          dataIndex: "description",
          width: 310,
          renderer: Classic.html,
        },
        {
          header: "地址/引用",
          dataIndex: "url",
          width: 250,
          renderer: function (v, m, r) {
            return Classic.html(v || r.get("ref_id") || "");
          },
        },
        {
          header: "收藏时间",
          dataIndex: "created_at",
          width: 140,
          renderer: Classic.date,
        },
        Classic.actionColumn(
          [
            { act: "preview", text: "预览" },
            { act: "open", text: "打开", icon: "assets/icons/chain.png" },
            { act: "tags", text: "标签" },
            { act: "remove", text: "删除" },
          ],
          220,
        ),
      ],
      viewConfig: { forceFit: true, emptyText: "暂无书签记录" },
      tbar: [
        { text: "添加书签", iconCls: "icon-add", handler: addBookmark },
        {
          text: "标签管理",
          iconCls: "icon-tag",
          handler: function () {
            Classic.simpleTagManager({
              prefix: "bookmark",
              title: "书签标签管理",
              onPreview: function (tag) {
                Classic.openTagPreview("bookmark", tag);
              },
              onClose: function () {
                tagFilter.reloadTags();
              },
            });
          },
        },
        "->",
        type,
        tagFilter,
        search,
        {
          text: "查询",
          iconCls: "icon-search",
          handler: function () {
            offset = 0;
            load();
          },
        },
      ],
      bbar: [
        {
          text: "上一页",
          iconCls: "icon-prev",
          handler: function () {
            offset = Math.max(0, offset - 1);
            load();
          },
        },
        {
          text: "下一页",
          iconCls: "icon-next",
          handler: function () {
            if (store.getCount() >= pageSize) {
              offset++;
              load();
            }
          },
        },
        "-",
        { xtype: "tbtext", text: "第 1 页" },
      ],
    });
    Classic.bindRowActions(grid, {
      preview: previewBookmark,
      open: openBookmark,
      tags: function (r) {
        Classic.assignTags({
          prefix: "bookmark",
          ownerKey: "bookmark_id",
          ownerId: Number(r.id),
          getProcedure: "getBookmarkTags",
          addProcedure: "addTagToBookmark",
          removeProcedure: "removeTagFromBookmark",
          title: "设置书签标签",
        });
      },
      remove: removeBookmark,
    }, previewBookmark);
    function load() {
      Classic.api(
        "bookmark.list",
        {
          offset: offset,
          sort: "time_desc",
          search: search.getValue(),
          type: type.getValue() || null,
          tag_id: tagFilter.getTagId(),
        },
        function (data) {
          Classic.loadArray(store, data);
          grid
            .getBottomToolbar()
            .items.itemAt(3)
            .setText(pagingText(offset, store.getCount()));
        },
      );
    }
    function addBookmark() {
      var box = Classic.windowForm({
        title: "添加书签",
        width: 560,
        items: [
          {
            xtype: "combo",
            fieldLabel: "书签类型",
            name: "type",
            hiddenName: "type",
            mode: "local",
            triggerAction: "all",
            editable: false,
            allowBlank: false,
            value: "url",
            store: [
              ["url", "网页地址"],
              ["note", "笔记引用"],
              ["image", "图片引用"],
              ["file", "文件引用"],
            ],
          },
          {
            xtype: "textfield",
            fieldLabel: "标题",
            name: "title",
            allowBlank: false,
          },
          { xtype: "textfield", fieldLabel: "网页地址", name: "url" },
          { xtype: "textfield", fieldLabel: "资源编号", name: "ref_id" },
          {
            xtype: "textarea",
            fieldLabel: "说明",
            name: "description",
            height: 80,
          },
          {
            xtype: "textarea",
            fieldLabel: "摘录内容",
            name: "content",
            height: 90,
          },
        ],
        onSave: function (values, win) {
          if (!values.ref_id) values.ref_id = null;
          values.tag_ids = [];
          Classic.api("bookmark.add", values, function () {
            win.close();
            load();
          });
        },
      });
      box.window.addButton({
        text: "读取网页摘要",
        iconCls: "icon-refresh",
        handler: function () {
          var url = box.form.getForm().findField("url").getValue();
          if (!url) return;
          Classic.api("bookmark.fetchUrl", { url: url }, function (data) {
            box.form
              .getForm()
              .findField("title")
              .setValue(data.title || "");
            box.form
              .getForm()
              .findField("description")
              .setValue(data.description || "");
            box.form
              .getForm()
              .findField("content")
              .setValue(data.content || "");
          });
        },
      });
    }
    function previewBookmark(r) {
      if (!r) return;
      var tabId = "page-bookmark-" + r.id;
      var typeNames = {
        url: "网页",
        note: "笔记",
        image: "图片",
        file: "文件",
      };
      function render(tags) {
        var url = r.get("url");
        Classic.openPage(
          tabId,
          r.get("title") || "书签预览",
          "icon-bookmark",
          [
            '<div class="preview-page">',
            "<h2>" + Classic.html(r.get("title") || "未命名书签") + "</h2>",
            '<div class="preview-page-meta">类型：' +
              Classic.html(typeNames[r.get("type")] || r.get("type") || "") +
              "　收藏：" +
              Classic.html(Classic.date(r.get("created_at"))) +
              "</div>",
            '<div class="preview-page-tags">' + Classic.tagChips(tags) + "</div>",
            url
              ? '<div class="preview-page-meta">地址：<a href="' +
                Classic.html(url) +
                '" target="_blank">' +
                Classic.html(url) +
                "</a></div>"
              : "",
            r.get("ref_id")
              ? '<div class="preview-page-meta">引用：' +
                Classic.html(r.get("ref_id")) +
                "</div>"
              : "",
            r.get("description")
              ? '<div class="preview-page-body">' +
                Classic.html(r.get("description")) +
                "</div>"
              : "",
            r.get("content")
              ? '<div class="preview-page-body">' +
                Classic.html(r.get("content")) +
                "</div>"
              : "",
            "</div>",
          ].join(""),
        );
      }
      Classic.api(
        "bookmark.getBookmarkTags",
        { bookmark_id: Number(r.id) },
        function (tags) {
          render(tags || []);
        },
        { silent: true, failure: function () { render([]); } },
      );
    }
    function openBookmark(r) {
      if (!r) return;
      if (r.get("url")) window.open(r.get("url"), "_blank");
      else
        Ext.Msg.alert("资源引用", "引用编号：" + Classic.html(r.get("ref_id")));
    }
    function removeBookmark(r) {
      if (!r) return;
      Classic.confirm(
        "确定删除书签“" + Classic.html(r.get("title")) + "”吗？",
        function () {
          Classic.api("bookmark.remove", { id: Number(r.id) }, load);
        },
      );
    }
    grid.reloadModule = load;
    grid.on("afterrender", load, grid, { single: true });
    return Ext.apply(grid, { iconCls: "icon-bookmark" });
  };

  Classic.modules.images = function () {
    var offset = 0,
      pageSize = 30;
    var store = Classic.arrayStore([
      "id",
      "name",
      "filename",
      "url",
      "remark",
      "size",
      "created_at",
    ]);
    var search = new Ext.form.TextField({
      width: 170,
      emptyText: "图片名称",
      listeners: {
        specialkey: function (field, e) {
          if (e.getKey() === e.ENTER) {
            offset = 0;
            load();
          }
        },
      },
    });
    var tagFilter = Classic.tagFilterCombo("image_bed", function () {
      offset = 0;
      load();
    });
    var view = new Ext.DataView({
      store: store,
      autoScroll: true,
      simpleSelect: true,
      overClass: "image-thumb-over",
      selectedClass: "image-thumb-selected",
      itemSelector: "div.image-thumb",
      emptyText: '<div class="image-empty">暂无图片记录</div>',
      deferEmptyText: false,
      tpl: new Ext.XTemplate(
        '<div class="image-thumb-wrap">',
        '<tpl for=".">',
        '<div class="image-thumb" title="{[Classic.html(values.name)]}">',
        '<div class="image-thumb-img"><img src="{[Classic.html(Classic.thumbUrl(values.url, 320))]}" alt="{[Classic.html(values.name)]}"></div>',
        '<div class="image-thumb-name">{[Classic.html(values.name)]}</div>',
        '<div class="image-thumb-actions">',
        '{[Classic.actionHtml([{act:"preview",text:"大图"},{act:"rename",text:"重命名"},{act:"tags",text:"标签"}])]}',
        "</div>",
        "</div>",
        "</tpl>",
        "</div>",
      ),
    });
    Classic.bindViewActions(view, {
      preview: previewImage,
      rename: rename,
      tags: function (r) {
        Classic.assignTags({
          prefix: "image_bed",
          ownerKey: "image_id",
          ownerId: Number(r.id),
          getProcedure: "getImageTags",
          addProcedure: "addTagToImage",
          removeProcedure: "removeTagFromImage",
          title: "设置图片标签",
        });
      },
    }, previewImage);
    var panel = new Ext.Panel({
      title: "图片管理",
      iconCls: "icon-image",
      layout: "fit",
      items: view,
      tbar: [
        { text: "上传图片", iconCls: "icon-upload", handler: uploadImage },
        {
          text: "标签管理",
          iconCls: "icon-tag",
          handler: function () {
            Classic.simpleTagManager({
              prefix: "image_bed",
              title: "图片标签管理",
              onPreview: function (tag) {
                Classic.openTagPreview("image", tag);
              },
              onClose: function () {
                tagFilter.reloadTags();
              },
            });
          },
        },
        "->",
        tagFilter,
        search,
        {
          text: "查询",
          iconCls: "icon-search",
          handler: function () {
            offset = 0;
            load();
          },
        },
      ],
      bbar: [
        {
          text: "上一页",
          iconCls: "icon-prev",
          handler: function () {
            offset = Math.max(0, offset - 1);
            load();
          },
        },
        {
          text: "下一页",
          iconCls: "icon-next",
          handler: function () {
            if (store.getCount() >= pageSize) {
              offset++;
              load();
            }
          },
        },
        "-",
        { xtype: "tbtext", text: "第 1 页" },
      ],
    });
    function previewImage(record) {
      var url = Classic.assetUrl(record.get("url"));
      var win = new Ext.Window({
        title: record.get("name") || "图片预览",
        iconCls: "icon-image",
        modal: true,
        width: 860,
        height: 580,
        layout: "fit",
        items: [
          {
            xtype: "box",
            autoEl: {
              tag: "div",
              cls: "image-preview-wrap",
              html:
                '<img src="' +
                Classic.html(url) +
                '" alt="' +
                Classic.html(record.get("name")) +
                '">',
            },
          },
        ],
        buttons: [
          {
            text: "打开原图",
            iconCls: "icon-link",
            handler: function () {
              if (url) window.open(url, "_blank");
            },
          },
          {
            text: "复制地址",
            iconCls: "icon-copy",
            handler: function () {
              Ext.Msg.alert("图片地址", Classic.html(url));
            },
          },
          {
            text: "关闭",
            iconCls: "icon-close",
            handler: function () {
              win.close();
            },
          },
        ],
      });
      win.show();
    }
    function load() {
      Classic.api(
        "image_bed.list",
        {
          user_id: String((Classic.boot.profile || {}).id || ""),
          offset: offset,
          sort: "time_desc",
          search: search.getValue(),
          tag_id: tagFilter.getTagId(),
        },
        function (data) {
          Classic.loadArray(store, data);
          panel
            .getBottomToolbar()
            .items.itemAt(3)
            .setText(pagingText(offset, store.getCount()));
        },
      );
    }
    function uploadImage() {
      var form = new Ext.form.FormPanel({
        fileUpload: true,
        border: false,
        bodyStyle: "padding:12px",
        labelWidth: 75,
        defaults: { anchor: "100%" },
        items: [
          {
            xtype: "textfield",
            inputType: "file",
            fieldLabel: "选择图片",
            name: "upload_file",
            allowBlank: false,
          },
          { xtype: "textfield", fieldLabel: "图片名称", name: "name" },
          { xtype: "textarea", fieldLabel: "备注", name: "remark", height: 70 },
          { xtype: "hidden", name: "kind", value: "image" },
        ],
      });
      var win = new Ext.Window({
        title: "上传图片",
        iconCls: "icon-upload",
        width: 470,
        height: 280,
        minHeight: 220,
        modal: true,
        constrain: true,
        layout: "fit",
        items: form,
        buttons: [
          {
            text: "开始上传",
            iconCls: "icon-upload",
            handler: function () {
              if (!form.getForm().isValid()) return;
              form.getForm().submit({
                url: "upload.php",
                waitMsg: "正在上传图片...",
                success: function () {
                  win.close();
                  load();
                },
                failure: function (f, a) {
                  Ext.Msg.alert(
                    "上传失败",
                    Classic.html(
                      a.result && a.result.message
                        ? a.result.message
                        : "上传未完成",
                    ),
                  );
                },
              });
            },
          },
          {
            text: "取消",
            iconCls: "icon-close",
            handler: function () {
              win.close();
            },
          },
        ],
      });
      win.show();
    }
    function rename(r) {
      if (!r) return;
      Ext.Msg.prompt(
        "图片重命名",
        "请输入新的图片名称：",
        function (b, text) {
          if (b === "ok" && text)
            Classic.api(
              "image_bed.rename",
              { id: Number(r.id), name: text },
              load,
            );
        },
        null,
        false,
        r.get("name"),
      );
    }
    panel.reloadModule = load;
    panel.on("afterrender", load, panel, { single: true });
    return panel;
  };

  Classic.modules.files = function () {
    var folderId = null,
      offset = 0,
      pageSize = 30;
    var store = Classic.arrayStore(
      [
        "row_id",
        "kind",
        "id",
        "name",
        "size",
        "mime_type",
        "parent_id",
        "public_url",
        "created_at",
      ],
      "row_id",
    );
    var search = new Ext.form.TextField({
      width: 160,
      emptyText: "文件或目录名称",
    });
    var crumb = new Ext.BoxComponent({
      region: "north",
      height: 28,
      autoEl: { tag: "div", cls: "breadcrumb-bar", html: "当前位置：根目录" },
    });
    var grid = new Ext.grid.GridPanel({
      region: "center",
      store: store,
      stripeRows: true,
      columns: [
        {
          header: "类型",
          dataIndex: "kind",
          width: 60,
          renderer: function (v) {
            return v === "folder"
              ? '<img src="assets/icons/folder.png"> 目录'
              : '<img src="assets/icons/document.png"> 文件';
          },
        },
        {
          header: "名称",
          dataIndex: "name",
          width: 320,
          renderer: function (v, m, r) {
            return r.get("kind") === "folder"
              ? '<span class="grid-link">' + Classic.html(v) + "</span>"
              : Classic.html(v);
          },
        },
        {
          header: "大小",
          dataIndex: "size",
          width: 90,
          renderer: function (v, m, r) {
            return r.get("kind") === "folder" ? "" : Classic.bytes(v);
          },
        },
        { header: "类型说明", dataIndex: "mime_type", width: 190 },
        {
          header: "建立时间",
          dataIndex: "created_at",
          width: 145,
          renderer: Classic.date,
        },
        Classic.actionColumn(function (r) {
          if (r.get("kind") === "folder") {
            return [
              { act: "open", text: "打开" },
              { act: "rename", text: "重命名" },
            ];
          }
          return [
            { act: "download", text: "下载" },
            { act: "rename", text: "重命名" },
          ];
        }, 160),
      ],
      viewConfig: { forceFit: true, emptyText: "该目录中没有文件" },
      tbar: [
        {
          text: "返回上级",
          iconCls: "icon-prev",
          handler: goParent,
        },
        { text: "新建文件夹", iconCls: "icon-folder", handler: createFolder },
        { text: "上传文件", iconCls: "icon-upload", handler: uploadFile },
        "-",
        { text: "刷新", iconCls: "icon-refresh", handler: load },
        "->",
        search,
        {
          text: "查询",
          iconCls: "icon-search",
          handler: function () {
            offset = 0;
            load();
          },
        },
      ],
      bbar: [
        {
          text: "上一页",
          iconCls: "icon-prev",
          handler: function () {
            offset = Math.max(0, offset - 1);
            load();
          },
        },
        {
          text: "下一页",
          iconCls: "icon-next",
          handler: function () {
            if (store.getCount() >= pageSize) {
              offset++;
              load();
            }
          },
        },
        "-",
        { xtype: "tbtext", text: "第 1 页" },
      ],
    });
    Classic.bindRowActions(
      grid,
      {
        open: openFolder,
        download: download,
        rename: rename,
      },
      function (r) {
        if (r.get("kind") === "folder") openFolder(r);
        else download(r);
      },
    );
    var panel = new Ext.Panel({
      title: "文件管理",
      iconCls: "icon-drive",
      layout: "border",
      items: [crumb, grid],
    });
    function load() {
      Classic.api(
        "file_drive.list",
        {
          folder_id: folderId,
          offset: offset,
          sort: "time_desc",
          search: search.getValue(),
          search_scope: "current",
        },
        function (data) {
          var rows = [];
          Ext.each(data.folders || [], function (r) {
            r.kind = "folder";
            r.row_id = "folder-" + r.id;
            rows.push(r);
          });
          Ext.each(data.files || [], function (r) {
            r.kind = "file";
            r.row_id = "file-" + r.id;
            rows.push(r);
          });
          Classic.loadArray(store, rows);
          panel.currentData = data;
          var parts = ["根目录"];
          Ext.each(data.breadcrumbs || [], function (r) {
            parts.push(Classic.html(r.name));
          });
          crumb.getEl().update("当前位置：" + parts.join(" &gt; "));
          grid
            .getBottomToolbar()
            .items.itemAt(3)
            .setText(pagingText(offset, store.getCount()));
        },
      );
    }
    function goParent() {
      var data = panel.currentData || {};
      var crumbs = data.breadcrumbs || [];
      if (crumbs.length > 1) folderId = String(crumbs[crumbs.length - 2].id);
      else folderId = null;
      offset = 0;
      load();
    }
    function createFolder() {
      Ext.Msg.prompt("新建文件夹", "请输入文件夹名称：", function (b, text) {
        if (b === "ok" && text)
          Classic.api(
            "file_drive.createFolder",
            { name: text, parent_id: folderId },
            load,
          );
      });
    }
    function openFolder(r) {
      if (!r) return;
      folderId = String(r.get("id"));
      offset = 0;
      load();
    }
    function rename(r) {
      if (!r) return;
      Ext.Msg.prompt(
        "重命名",
        "请输入新的名称：",
        function (b, text) {
          if (b !== "ok" || !text) return;
          var proc =
            r.get("kind") === "folder"
              ? "file_drive.renameFolder"
              : "file_drive.renameFile";
          Classic.api(
            proc,
            {
              id:
                r.get("kind") === "folder"
                  ? String(r.get("id"))
                  : Number(r.get("id")),
              name: text,
            },
            load,
          );
        },
        null,
        false,
        r.get("name"),
      );
    }
    function download(r) {
      if (!r) return;
      Classic.api(
        "file_drive.getDownloadUrl",
        { file_id: Number(r.get("id")) },
        function (data) {
          window.open(data.url, "_blank");
        },
      );
    }
    function uploadFile() {
      var form = new Ext.form.FormPanel({
        fileUpload: true,
        border: false,
        bodyStyle: "padding:12px",
        labelWidth: 75,
        defaults: { anchor: "100%" },
        items: [
          {
            xtype: "textfield",
            inputType: "file",
            fieldLabel: "选择文件",
            name: "upload_file",
            allowBlank: false,
          },
          { xtype: "textfield", fieldLabel: "显示名称", name: "name" },
          { xtype: "hidden", name: "kind", value: "file" },
          { xtype: "hidden", name: "folder_id", value: folderId || "" },
        ],
      });
      var win = new Ext.Window({
        title: "上传文件",
        iconCls: "icon-upload",
        width: 470,
        height: 240,
        minHeight: 200,
        modal: true,
        constrain: true,
        layout: "fit",
        items: form,
        buttons: [
          {
            text: "开始上传",
            iconCls: "icon-upload",
            handler: function () {
              if (!form.getForm().isValid()) return;
              form.getForm().submit({
                url: "upload.php",
                waitMsg: "正在上传文件...",
                success: function () {
                  win.close();
                  load();
                },
                failure: function (f, a) {
                  Ext.Msg.alert(
                    "上传失败",
                    Classic.html(
                      a.result && a.result.message
                        ? a.result.message
                        : "上传未完成",
                    ),
                  );
                },
              });
            },
          },
          {
            text: "取消",
            iconCls: "icon-close",
            handler: function () {
              win.close();
            },
          },
        ],
      });
      win.show();
    }
    panel.reloadModule = load;
    panel.on("afterrender", load, panel, { single: true });
    return panel;
  };
})();
