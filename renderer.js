let currentTree = null;
let expandedFolders = new Set();

async function selectFolder() {
  const tree = await window.electronAPI.selectFolder();
  if (tree) {
    currentTree = tree;
    expandedFolders.clear();
    expandedFolders.add(tree.path);
    renderTree();
    document.getElementById('copy-btn').classList.remove('hidden');
    document.getElementById('show-text-btn').classList.remove('hidden');
  }
}

function renderTree() {
  const container = document.getElementById('tree-container');
  container.innerHTML = '';
  
  if (!currentTree) return;
  
  renderNode(currentTree, container, 0);
}

function renderNode(node, parent, level) {
  const div = document.createElement('div');
  div.className = 'tree-item';
  div.style.paddingLeft = (level * 20) + 'px';
  
  const isExpanded = expandedFolders.has(node.path);
  const hasChildren = Object.keys(node.children || {}).length > 0;
  
  if (node.isFolder && hasChildren) {
    const chevron = document.createElement('span');
    chevron.className = 'chevron' + (isExpanded ? ' expanded' : '');
    chevron.textContent = '▶';
    div.appendChild(chevron);
  } else if (node.isFolder) {
    div.innerHTML += '<span class="chevron" style="opacity:0">▶</span>';
  } else {
    div.innerHTML += '<span style="width:16px;display:inline-block"></span>';
  }
  
  const icon = node.isFolder ? '📁 ' : '📄 ';
  const name = document.createElement('span');
  name.className = node.isFolder ? 'folder' : 'file';
  name.textContent = icon + node.name;
  div.appendChild(name);
  
  if (!node.isFolder && node.size) {
    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = formatSize(node.size);
    div.appendChild(size);
  }
  
  if (node.isFolder) {
    div.onclick = (e) => {
      e.stopPropagation();
      toggleFolder(node.path);
    };
  }
  
  parent.appendChild(div);
  
  if (node.isFolder && isExpanded && hasChildren) {
    const children = Object.values(node.children).sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });
    
    children.forEach(child => renderNode(child, parent, level + 1));
  }
}

function toggleFolder(path) {
  if (expandedFolders.has(path)) {
    expandedFolders.delete(path);
  } else {
    expandedFolders.add(path);
  }
  renderTree();
}

function formatSize(bytes) {
  if (bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `(${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]})`;
}

function generateTextTree(node, prefix = '', isLast = true, isRoot = false) {
  let result = '';
  
  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    result += prefix + connector + node.name + (node.isFolder ? '' : ' ' + formatSize(node.size)) + '\n';
  }
  
  if (node.isFolder && node.children) {
    const children = Object.values(node.children).sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });
    
    children.forEach((child, index) => {
      const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      const childIsLast = index === children.length - 1;
      result += generateTextTree(child, newPrefix, childIsLast, false);
    });
  }
  
  return result;
}

function copyToClipboard() {
  if (!currentTree) return;
  
  const text = currentTree.name + '\n' + generateTextTree(currentTree, '', true, true);
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied to clipboard';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

function toggleTextView() {
  const textarea = document.getElementById('text-output');
  const treeContainer = document.getElementById('tree-container');
  
  if (textarea.classList.contains('hidden')) {
    const text = currentTree.name + '\n' + generateTextTree(currentTree, '', true, true);
    textarea.value = text;
    textarea.classList.remove('hidden');
    treeContainer.classList.add('hidden');
    document.getElementById('show-text-btn').textContent = 'Show tree';
  } else {
    textarea.classList.add('hidden');
    treeContainer.classList.remove('hidden');
    document.getElementById('show-text-btn').textContent = 'Show as text';
  }
}