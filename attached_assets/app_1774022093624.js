/* ===========================
   ATREYU AIOS — Frontend App
   =========================== */

// --- State ---
let currentProject = null;
let openTabs = [];       // [{ path, content, model }]
let activeTabPath = null;
let editor = null;
let chatSessionId = "chat-" + Date.now();
let isStreaming = false;

// ===========================
// INIT
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  initMonaco();
  checkAuthStatus();
  initResizeHandles();
});

function initMonaco() {
  require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
  });
  require(["vs/editor/editor.main"], () => {
    monaco.editor.defineTheme("atreyu-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d1117",
        "editorGutter.background": "#0d1117",
        "editor.lineHighlightBackground": "#161b22",
      },
    });
    editor = monaco.editor.create(document.getElementById("monaco-container"), {
      value: "// Welcome to ATREYU AIOS\n// Select or create a project, then open a file to start editing.",
      language: "javascript",
      theme: "atreyu-dark",
      fontSize: 13,
      fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 10 },
      automaticLayout: true,
      wordWrap: "on",
    });

    // Auto-save on change
    editor.onDidChangeModelContent(() => {
      if (activeTabPath) {
        const tab = openTabs.find((t) => t.path === activeTabPath);
        if (tab) tab.content = editor.getValue();
      }
    });

    // Ctrl+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile();
    });
  });
}

// ===========================
// AUTH
// ===========================
async function checkAuthStatus() {
  try {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    if (data.authenticated) {
      showIDE();
      document.getElementById("key-hint").textContent = data.keyHint;
      loadProjects();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

async function connectApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  const btn = document.getElementById("connect-btn");
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  if (!key) {
    errEl.textContent = "Please enter your API key.";
    errEl.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Validating...";

  try {
    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json();

    if (data.success) {
      showIDE();
      checkAuthStatus();
    } else {
      errEl.textContent = data.error;
      errEl.style.display = "block";
    }
  } catch (err) {
    errEl.textContent = "Connection failed. Check your network.";
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Connect & Launch ATREYU";
  }
}

async function disconnect() {
  if (!confirm("Disconnect your API key and return to login?")) return;
  await fetch("/api/auth/disconnect", { method: "POST" });
  currentProject = null;
  openTabs = [];
  activeTabPath = null;
  showLogin();
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("ide-screen").style.display = "none";
}

function showIDE() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("ide-screen").style.display = "flex";
  document.getElementById("ide-screen").style.flexDirection = "column";
}

// Handle enter on login
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("login-screen").style.display !== "none") {
    if (document.activeElement.id === "api-key-input") connectApiKey();
  }
});

// ===========================
// PROJECTS
// ===========================
async function loadProjects() {
  const res = await fetch("/api/projects");
  const projects = await res.json();
  const sel = document.getElementById("project-select");
  sel.innerHTML = '<option value="">-- Select Project --</option>';
  for (const p of projects) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  }
  if (currentProject) sel.value = currentProject;
}

function switchProject() {
  const sel = document.getElementById("project-select");
  currentProject = sel.value || null;
  openTabs = [];
  activeTabPath = null;
  renderTabs();
  if (currentProject) {
    refreshFileTree();
  } else {
    document.getElementById("file-tree").innerHTML =
      '<p class="empty-state">Select or create a project to get started</p>';
  }
}

function showNewProjectModal() {
  document.getElementById("modal-content").innerHTML = `
    <h3>Create New Project</h3>
    <div class="input-group">
      <label>Project Name</label>
      <input type="text" id="new-project-name" placeholder="my-project" />
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" style="width:auto;padding:8px 20px" onclick="createProject()">Create</button>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById("new-project-name").focus(), 100);
}

async function createProject() {
  const name = document.getElementById("new-project-name").value.trim();
  if (!name) return;
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  currentProject = data.id;
  closeModal();
  await loadProjects();
  document.getElementById("project-select").value = currentProject;
  refreshFileTree();
}

function showCloneModal() {
  document.getElementById("modal-content").innerHTML = `
    <h3>Clone Git Repository</h3>
    <div class="input-group">
      <label>Repository URL</label>
      <input type="text" id="clone-url" placeholder="https://github.com/user/repo.git" />
    </div>
    <div id="clone-status" style="display:none;margin-bottom:12px;color:var(--text-secondary);font-size:12px"></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" style="width:auto;padding:8px 20px" id="clone-btn" onclick="cloneRepo()">Clone</button>
    </div>
  `;
  openModal();
  setTimeout(() => document.getElementById("clone-url").focus(), 100);
}

async function cloneRepo() {
  const url = document.getElementById("clone-url").value.trim();
  if (!url) return;
  const btn = document.getElementById("clone-btn");
  const status = document.getElementById("clone-status");
  btn.disabled = true;
  btn.textContent = "Cloning...";
  status.style.display = "block";
  status.textContent = "Cloning repository, this may take a moment...";

  try {
    const res = await fetch("/api/projects/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: url }),
    });
    const data = await res.json();
    if (data.error) {
      status.style.color = "var(--red)";
      status.textContent = data.error;
      btn.disabled = false;
      btn.textContent = "Clone";
      return;
    }
    currentProject = data.id;
    closeModal();
    await loadProjects();
    document.getElementById("project-select").value = currentProject;
    refreshFileTree();
  } catch {
    status.style.color = "var(--red)";
    status.textContent = "Clone failed. Check URL and try again.";
    btn.disabled = false;
    btn.textContent = "Clone";
  }
}

function showUploadModal() {
  if (!currentProject) {
    alert("Create or select a project first.");
    return;
  }
  document.getElementById("modal-content").innerHTML = `
    <h3>Upload Files</h3>
    <p style="color:var(--text-secondary);font-size:12px;margin-bottom:16px">
      Select files or a folder to upload to <strong>${currentProject}</strong>
    </p>
    <div class="input-group">
      <label>Select Files</label>
      <input type="file" id="upload-files" multiple />
    </div>
    <div class="input-group">
      <label>Or Select Folder</label>
      <input type="file" id="upload-folder" webkitdirectory directory multiple />
    </div>
    <div id="upload-status" style="display:none;font-size:12px;margin-bottom:12px"></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" style="width:auto;padding:8px 20px" id="upload-btn" onclick="uploadFiles()">Upload</button>
    </div>
  `;
  openModal();
}

async function uploadFiles() {
  const fileInput = document.getElementById("upload-files");
  const folderInput = document.getElementById("upload-folder");
  const files = fileInput.files.length > 0 ? fileInput.files : folderInput.files;
  if (!files || files.length === 0) return;

  const btn = document.getElementById("upload-btn");
  const status = document.getElementById("upload-status");
  btn.disabled = true;
  btn.textContent = "Uploading...";
  status.style.display = "block";
  status.style.color = "var(--text-secondary)";
  status.textContent = `Uploading ${files.length} file(s)...`;

  const form = new FormData();
  form.append("projectId", currentProject);
  for (const f of files) {
    form.append("files", f);
    // Preserve relative paths for folder uploads
    if (f.webkitRelativePath) {
      form.append(`path_${f.name}`, f.webkitRelativePath);
    }
  }

  try {
    const res = await fetch(`/api/projects/${currentProject}/upload`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (data.error) {
      status.style.color = "var(--red)";
      status.textContent = data.error;
      btn.disabled = false;
      btn.textContent = "Upload";
      return;
    }
    closeModal();
    refreshFileTree();
  } catch {
    status.style.color = "var(--red)";
    status.textContent = "Upload failed.";
    btn.disabled = false;
    btn.textContent = "Upload";
  }
}

// ===========================
// FILE TREE
// ===========================
async function refreshFileTree() {
  if (!currentProject) return;
  const container = document.getElementById("file-tree");

  try {
    const res = await fetch(`/api/files/${currentProject}`);
    const tree = await res.json();
    if (tree.length === 0) {
      container.innerHTML = '<p class="empty-state">Project is empty. Upload files or clone a repo.</p>';
      return;
    }
    container.innerHTML = "";
    renderTreeNodes(container, tree, 0);
  } catch {
    container.innerHTML = '<p class="empty-state">Failed to load files</p>';
  }
}

function renderTreeNodes(parent, nodes, depth) {
  for (const node of nodes) {
    if (node.type === "dir") {
      const wrapper = document.createElement("div");

      const item = document.createElement("div");
      item.className = "tree-item";
      item.style.setProperty("--depth", depth);
      item.innerHTML = `
        <span class="tree-toggle">&#9654;</span>
        <span class="tree-icon">&#128193;</span>
        <span class="tree-name">${escapeHtml(node.name)}</span>
      `;

      const children = document.createElement("div");
      children.className = "tree-children";
      renderTreeNodes(children, node.children || [], depth + 1);

      item.addEventListener("click", () => {
        const isOpen = children.classList.toggle("open");
        item.querySelector(".tree-toggle").innerHTML = isOpen ? "&#9660;" : "&#9654;";
      });

      wrapper.appendChild(item);
      wrapper.appendChild(children);
      parent.appendChild(wrapper);
    } else {
      const item = document.createElement("div");
      item.className = "tree-item";
      item.style.setProperty("--depth", depth);
      item.dataset.path = node.path;
      item.innerHTML = `
        <span class="tree-toggle" style="visibility:hidden">&#9654;</span>
        <span class="tree-icon">${getFileIcon(node.name)}</span>
        <span class="tree-name">${escapeHtml(node.name)}</span>
      `;
      item.addEventListener("click", () => openFile(node.path, node.name));
      parent.appendChild(item);
    }
  }
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    js: "&#128312;", ts: "&#128309;", py: "&#128154;", html: "&#128992;",
    css: "&#128311;", json: "&#128313;", md: "&#128220;", jsx: "&#128312;",
    tsx: "&#128309;", vue: "&#128154;", rb: "&#128308;", go: "&#128309;",
    rs: "&#128992;", java: "&#128308;", php: "&#128312;", sql: "&#128313;",
    yml: "&#128313;", yaml: "&#128313;", toml: "&#128313;", sh: "&#128311;",
  };
  return icons[ext] || "&#128196;";
}

// ===========================
// EDITOR TABS + FILE OPEN
// ===========================
async function openFile(filePath) {
  // Check if already open
  const existing = openTabs.find((t) => t.path === filePath);
  if (existing) {
    activateTab(filePath);
    return;
  }

  try {
    const res = await fetch(`/api/files/${currentProject}/${filePath}`);
    if (!res.ok) return;
    const content = await res.text();

    const lang = getLanguageFromPath(filePath);
    const model = monaco.editor.createModel(content, lang);

    openTabs.push({ path: filePath, content, model });
    activateTab(filePath);
    renderTabs();
  } catch (err) {
    console.error("Failed to open file:", err);
  }
}

function activateTab(filePath) {
  activeTabPath = filePath;
  const tab = openTabs.find((t) => t.path === filePath);
  if (tab && editor) {
    editor.setModel(tab.model);
  }
  renderTabs();

  // Highlight in file tree
  document.querySelectorAll(".tree-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.path === filePath);
  });
}

function closeTab(filePath, event) {
  if (event) event.stopPropagation();
  const idx = openTabs.findIndex((t) => t.path === filePath);
  if (idx === -1) return;

  openTabs[idx].model.dispose();
  openTabs.splice(idx, 1);

  if (activeTabPath === filePath) {
    if (openTabs.length > 0) {
      const newIdx = Math.min(idx, openTabs.length - 1);
      activateTab(openTabs[newIdx].path);
    } else {
      activeTabPath = null;
      if (editor) {
        editor.setModel(monaco.editor.createModel("// No file open", "plaintext"));
      }
    }
  }
  renderTabs();
}

function renderTabs() {
  const container = document.getElementById("editor-tabs");
  if (openTabs.length === 0) {
    container.innerHTML = '<div class="tab-placeholder">No file open</div>';
    return;
  }
  container.innerHTML = openTabs
    .map((t) => {
      const name = t.path.split("/").pop();
      const isActive = t.path === activeTabPath;
      return `<div class="tab ${isActive ? "active" : ""}" onclick="activateTab('${escapeAttr(t.path)}')">
        <span>${escapeHtml(name)}</span>
        <span class="close-tab" onclick="closeTab('${escapeAttr(t.path)}', event)">&times;</span>
      </div>`;
    })
    .join("");
}

async function saveCurrentFile() {
  if (!activeTabPath || !currentProject) return;
  const tab = openTabs.find((t) => t.path === activeTabPath);
  if (!tab) return;
  const content = editor.getValue();
  await fetch(`/api/files/${currentProject}/${activeTabPath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

function getLanguageFromPath(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    html: "html", htm: "html", css: "css", scss: "scss", less: "less",
    json: "json", xml: "xml", yaml: "yaml", yml: "yaml", toml: "ini",
    md: "markdown", sql: "sql", sh: "shell", bash: "shell", zsh: "shell",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    php: "php", swift: "swift", kt: "kotlin", r: "r",
    dockerfile: "dockerfile", makefile: "makefile",
  };
  return map[ext] || "plaintext";
}

// ===========================
// CHAT
// ===========================
function handleChatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (!message || !currentProject || isStreaming) return;

  input.value = "";
  isStreaming = true;
  document.getElementById("send-btn").disabled = true;

  // Add user message
  appendChatMessage("user", message);

  // Add typing indicator
  const typingId = appendTypingIndicator();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentProject,
        message,
        sessionId: chatSessionId,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    let assistantEl = null;

    // Remove typing indicator
    removeTypingIndicator(typingId);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (raw === "") continue;

        let event;
        try { event = JSON.parse(raw); } catch { continue; }

        if (event.type === "text") {
          assistantText += event.text;
          if (!assistantEl) {
            assistantEl = appendChatMessage("assistant", "");
          }
          assistantEl.innerHTML = renderMarkdown(assistantText);
        } else if (event.type === "tool_use") {
          appendToolIndicator(event.tool, JSON.stringify(event.input).slice(0, 80), "running");
        } else if (event.type === "tool_result") {
          appendToolIndicator(event.tool, event.result.slice(0, 120), "done");
        } else if (event.type === "tool_error") {
          appendToolIndicator(event.tool, event.error, "error");
        } else if (event.type === "error") {
          appendChatMessage("assistant", "Error: " + event.text);
        } else if (event.type === "done") {
          // Refresh file tree since Claude may have modified files
          refreshFileTree();
          // Reload active file if Claude edited it
          if (activeTabPath) {
            try {
              const r = await fetch(`/api/files/${currentProject}/${activeTabPath}`);
              if (r.ok) {
                const updated = await r.text();
                const tab = openTabs.find((t) => t.path === activeTabPath);
                if (tab && tab.content !== updated) {
                  tab.content = updated;
                  tab.model.setValue(updated);
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage("assistant", "Connection error: " + err.message);
  } finally {
    isStreaming = false;
    document.getElementById("send-btn").disabled = false;
    input.focus();
  }
}

function appendChatMessage(role, text) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}-msg`;
  if (role === "user") {
    div.textContent = text;
  } else {
    div.innerHTML = renderMarkdown(text);
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendToolIndicator(tool, detail, status) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  const icon = status === "running" ? "&#9881;" : status === "done" ? "&#10003;" : "&#10007;";
  const cls = status === "done" ? "tool-done" : status === "error" ? "tool-error" : "";
  div.className = `tool-indicator ${cls}`;
  div.innerHTML = `<span class="tool-icon">${icon}</span> <strong>${escapeHtml(tool)}</strong> <span style="opacity:0.6">${escapeHtml(detail)}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  const id = "typing-" + Date.now();
  div.id = id;
  div.className = "typing-indicator";
  div.innerHTML = "<span></span><span></span><span></span>";
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  document.getElementById("chat-messages").innerHTML = "";
  chatSessionId = "chat-" + Date.now();
  fetch(`/api/chat/${chatSessionId}`, { method: "DELETE" }).catch(() => {});
}

function renderMarkdown(text) {
  if (!text) return "";
  try {
    return marked.parse(text, { breaks: true });
  } catch {
    return escapeHtml(text);
  }
}

// ===========================
// MODALS
// ===========================
function openModal() {
  document.getElementById("modal-overlay").style.display = "flex";
}
function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

// ===========================
// RESIZE HANDLES
// ===========================
function initResizeHandles() {
  // Sidebar resize
  const sidebarHandle = document.getElementById("sidebar-resize");
  const sidebar = document.getElementById("sidebar");
  let dragging = null;

  sidebarHandle.addEventListener("mousedown", (e) => {
    dragging = "sidebar";
    sidebarHandle.classList.add("active");
    e.preventDefault();
  });

  // Chat resize
  const chatHandle = document.getElementById("chat-resize");
  const chatPanel = document.getElementById("chat-panel");

  chatHandle.addEventListener("mousedown", (e) => {
    dragging = "chat";
    chatHandle.classList.add("active");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    if (dragging === "sidebar") {
      const w = Math.max(180, Math.min(500, e.clientX));
      sidebar.style.width = w + "px";
    } else if (dragging === "chat") {
      const mainArea = document.querySelector(".main-area");
      const rect = mainArea.getBoundingClientRect();
      const h = Math.max(120, rect.bottom - e.clientY);
      chatPanel.style.height = h + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    if (dragging) {
      sidebarHandle.classList.remove("active");
      chatHandle.classList.remove("active");
      dragging = null;
      if (editor) editor.layout();
    }
  });
}

// ===========================
// UTILS
// ===========================
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
function escapeAttr(s) {
  return s.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
