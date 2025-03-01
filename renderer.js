window.addEventListener('DOMContentLoaded', async () => {
  let token = '';
  let menu_array = [];
  let write_all = false;
  let GUACAMOLE_URL = (await window.electronAPI.storeGet('url')) || 'http://localhost:8080/guacamole';
  let GUACAMOLE_TYPE = (await window.electronAPI.storeGet('type')) || 'mysql';
  let GUACAMOLE_USERNAME = (await window.electronAPI.storeGet('username')) || 'guacadmin';
  let GUACAMOLE_PASSWORD = (await window.electronAPI.storeGet('password')) || 'guacadmin';
  let GUACAMOLE_SAVE = (await window.electronAPI.storeGet('save')) || false;


  document.getElementById('url').value = GUACAMOLE_URL;
  document.getElementById('username').value = GUACAMOLE_USERNAME;
  document.getElementById('password').value = GUACAMOLE_PASSWORD;
  document.getElementById('type').value = GUACAMOLE_TYPE;
  document.getElementById('save').checked = GUACAMOLE_SAVE;

  document.getElementById('login-container').style.display = 'grid';
  document.getElementById('main-container').style.display = 'none';
  document.getElementById('main-container').style.height = '100%';
  document.getElementById('tree').style.overflow = 'auto';
  document.getElementById('loading').style.display = 'none';


  document.getElementById('refreshButton').addEventListener("click", async () => {
    await createMenu();
  });

  document.getElementById('collapseButton').addEventListener("click", async (e) => {
    if (e.target.className == "glyphicon glyphicon-eye-open") {
      document.getElementById('eye').className = "glyphicon glyphicon-eye-close";
      $('#tree').jstree(true).open_all();
    } else {
      $('#tree').jstree(true).close_all();
      document.getElementById('eye').className = "glyphicon glyphicon-eye-open";

    }
  });

  document.addEventListener('keydown', async (event) => {
    if (event.metaKey && event.shiftKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      write_all = !write_all;
    } else {
      if (event.key === 'Tab') {
        event.preventDefault();
      }
      if (write_all) {
        await window.electronAPI.keyEvent({
          type: 'keydown',
          key: event.key,
          code: event.code,
          keyCode: event.keyCode,
          which: event.which,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey
        });
        event.preventDefault();
      }

    }
  });

  document.addEventListener('keyup', async (event) => {
    if (write_all) {
      await window.electronAPI.keyEvent({
        type: 'keyup',
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        which: event.which,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      });
      event.preventDefault();
    }
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    GUACAMOLE_USERNAME = document.getElementById('username').value;
    GUACAMOLE_PASSWORD = document.getElementById('password').value;
    GUACAMOLE_TYPE = document.getElementById('type').value;
    GUACAMOLE_URL = document.getElementById('url').value;
    GUACAMOLE_SAVE = document.getElementById('save').checked;



    if (GUACAMOLE_SAVE) {
      await window.electronAPI.storeSet('url', GUACAMOLE_URL);
      await window.electronAPI.storeSet('username', GUACAMOLE_USERNAME);
      await window.electronAPI.storeSet('password', GUACAMOLE_PASSWORD);
      await window.electronAPI.storeSet('type', GUACAMOLE_TYPE);
      await window.electronAPI.storeSet('save', GUACAMOLE_SAVE);
    }

    await createMenu();
    $('#tree').on("activate_node.jstree", function (e, data) {
      if (data.hasOwnProperty('node')) {
        if (data.node.id == 'conn_' + data.node.original.identifier) {
          openWebview(data.node.original);
        }
      }
    });


  });

  async function createMenuArray(obj, parent_name) {
    const prefix_group = 'conn_group_';
    const prefix = 'conn_';
    obj.forEach((group) => {
      if (group.hasOwnProperty('childConnectionGroups')) {
        menu_array.push({ 'id': prefix_group + group.identifier, 'identifier': group.identifier, 'parent': parent_name, 'text': group.name });
        createMenuArray(group.childConnectionGroups, prefix_group + group.identifier);
      } else {
        menu_array.push({ 'id': prefix_group + group.identifier, 'identifier': group.identifier, 'parent': parent_name, 'text': group.name });
        group.childConnections.forEach((conn) => {
          menu_array.push({ 'id': prefix + conn.identifier, 'parent': prefix_group + group.identifier, 'identifier': conn.identifier, 'text': conn.name, "type": "file" });
        });

      }
    });
  }

  async function createMenu() {
    try {
      showLoading(true);
      token = await window.electronAPI.guacamoleLogin({ "url": GUACAMOLE_URL, "type": GUACAMOLE_TYPE, "username": GUACAMOLE_USERNAME, "password": GUACAMOLE_PASSWORD });

      let menu = await window.electronAPI.getConnectionGroups({ "url": GUACAMOLE_URL, "type": GUACAMOLE_TYPE, token });
      menu_array = [];
      await createMenuArray(menu[4], '#');

      document.getElementById('login-container').style.display = 'none';
      document.getElementById('main-container').style.display = 'grid';

      $('#tree').jstree({
        'core': {
          'data': menu_array
        },
        "types": {
          "default": { "valid_children": ["default", "file"] },
          "file": { "icon": "glyphicon glyphicon-log-in", "valid_children": [] }
        },
        "plugins": [
          "contextmenu", "dnd", "search",
          "state", "types", "wholerow"
        ],
        "search": {
          "show_only_matches": true
        }
      });
      $('#tree').jstree(true).close_all();
      showLoading(false);
    } catch (error) {
      showError(error.message);
      showLoading(false);
    }
  }

  document.getElementById('searchBox').addEventListener('input', function () {
    const box = document.getElementById('searchBox');
    const searchQuery = box.value.toLowerCase();
    $('#tree').jstree(true).search(searchQuery);
  });


  function openWebview(connection) {
    const webviews = document.querySelectorAll(".webview-wrapper");
    let container = "";
    const total = webviews.length;
    if (total > 9) {
      window.electronAPI.popUp({ "type": "info", "title": "Window Alert!", "message": "You've reached the maximum window size allowed!!!" });
      return;
    } else if (total < 5) {
      container = document.getElementById('r1');
    } else {
      container = document.getElementById('r2');
    }
    const webviewId = `webview-${connection.identifier}-${Date.now()}`;

    const webviewWrapper = document.createElement('div');
    webviewWrapper.className = 'webview-wrapper';
    webviewWrapper.id = webviewId;

    const webview = document.createElement('webview');
    webview.className = 'connection-webview w-100 h-100';
    webview.setAttribute('partition', 'persist:guacamole');
    webview.setAttribute('allowpopups', '');
    const base64Encoded = btoa(`${connection.identifier}\0c\0${GUACAMOLE_TYPE}`);
    const base64WithoutPadding = base64Encoded.replace(/=/g, '');
    webview.src = `${GUACAMOLE_URL}/#/client/${base64WithoutPadding}?token=${token}`;

    const cbtn = document.createElement('button');
    cbtn.className = 'close ';
    cbtn.setAttribute('aria-label', 'Close');
    const cbtns = document.createElement('span');
    cbtns.className = "float-right";
    cbtns.setAttribute('aria-hidden', true);
    cbtns.innerHTML = '&times;';
    cbtn.appendChild(cbtns);
    cbtns.onclick = () => {
      webviewWrapper.remove();
      updateLayout();
    };


    webview.setAttribute('disableblinkfeatures', 'Autofill');
    webview.setAttribute('disablewebsecurity', 'on');

    webview.addEventListener("focus", (e) => {
      if (write_all) {
        write_all = false;
      }
    });

    webview.addEventListener('did-fail-load', (e) => {
      console.error('Webview load error:', e);
      webview.loadURL(
        `data:text/html,<h1 style="padding:20px">Connection Error: ${e.errorDescription}</h1>`
      );
    });

    webviewWrapper.appendChild(cbtn);
    webviewWrapper.appendChild(webview);
    container.appendChild(webviewWrapper);

    updateLayout();
  }


  async function updateLayout() {
    const classTemp = "webview-wrapper card";
    const total_h = (document.querySelectorAll(".webview-wrapper").length < 6) ? 100 : 50;

    for (let i = 1; i < 3; i++) {
      webviews = document.getElementById("r" + i).querySelectorAll(".webview-wrapper");

      total = webviews.length;

      webviews.forEach((view, index) => {
        let md = 0;
        if (index < 3) {
          md = Math.floor((12 / total));
        } else {
          md = Math.ceil((12 / total));
        }
        view.className = classTemp + " col-md-" + md;
        view.style = "height: " + total_h + "vh;";

      });
    }
  }

  function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
  }

  function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => (errorDiv.style.display = 'none'), 5000);
  }
});
