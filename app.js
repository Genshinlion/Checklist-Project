/* ============================================================
   Site Commentary Checklist — App Logic
   ============================================================ */

const STORAGE_KEY = 'siteChecklist_v1';
const PHOTOS_KEY  = 'siteChecklist_photos_v1';

// ── State ────────────────────────────────────────────────────
let formData  = {};
let photoData = {}; // { key: [ { name, dataUrl } ] }
let saveTimer = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindFields();
  bindPhotoDropZones();
  bindRisksTable();
  bindRecommendations();
  bindSidebar();
  bindActions();
  observeSections();
  renderAll();
});

// ── Persistence ───────────────────────────────────────────────
function loadData() {
  try {
    const raw  = localStorage.getItem(STORAGE_KEY);
    const pRaw = localStorage.getItem(PHOTOS_KEY);
    if (raw)  formData  = JSON.parse(raw);
    if (pRaw) photoData = JSON.parse(pRaw);
  } catch (e) {
    console.warn('Could not load saved data', e);
  }
}

function saveData() {
  showSaving();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      localStorage.setItem(PHOTOS_KEY,  JSON.stringify(photoData));
    } catch (e) {
      // localStorage might be full (large photos)
      console.warn('Save failed – storage may be full', e);
    }
    showSaved();
  }, 400);
}

function showSaving() {
  const el = document.getElementById('autosaveIndicator');
  el.textContent = 'Saving…';
  el.className = 'autosave-indicator saving';
}

function showSaved() {
  const el = document.getElementById('autosaveIndicator');
  el.textContent = '✓ Saved';
  el.className = 'autosave-indicator saved';
}

// ── Bind text / select / date fields ─────────────────────────
function bindFields() {
  // text, date, select, textarea
  document.querySelectorAll('[data-key]').forEach(el => {
    if (el.type === 'radio') return; // handled separately

    // restore saved value
    if (formData[el.dataset.key] !== undefined) {
      el.value = formData[el.dataset.key];
    }

    el.addEventListener('input', () => {
      formData[el.dataset.key] = el.value;
      saveData();
    });

    el.addEventListener('change', () => {
      formData[el.dataset.key] = el.value;
      saveData();
    });
  });

  // radio buttons
  document.querySelectorAll('input[type="radio"][data-key]').forEach(radio => {
    if (formData[radio.dataset.key] === radio.value) {
      radio.checked = true;
    }
    radio.addEventListener('change', () => {
      formData[radio.dataset.key] = radio.value;
      saveData();
    });
  });
}

// ── Render all dynamic sections from saved state ──────────────
function renderAll() {
  renderRisksTable();
  renderRecommendations('high');
  renderRecommendations('medium');
  renderRecommendations('low');
  renderAllPhotoGrids();
}

// ── Photo Upload ──────────────────────────────────────────────
function bindPhotoDropZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    const key = zone.dataset.photoKey;

    // drag events
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(key, e.dataTransfer.files);
    });

    // file input inside the zone
    const input = zone.querySelector('input[type="file"]');
    if (input) {
      input.addEventListener('change', () => {
        handleFiles(key, input.files);
        input.value = '';
      });
    }
  });
}

function handleFiles(key, files) {
  if (!files || files.length === 0) return;
  if (!photoData[key]) photoData[key] = [];

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      photoData[key].push({ name: file.name, dataUrl: e.target.result });
      renderPhotoGrid(key);
      saveData();
    };
    reader.readAsDataURL(file);
  });
}

function renderAllPhotoGrids() {
  document.querySelectorAll('[data-photo-grid]').forEach(grid => {
    renderPhotoGrid(grid.dataset.photoGrid);
  });
}

function renderPhotoGrid(key) {
  const grid = document.querySelector(`[data-photo-grid="${key}"]`);
  if (!grid) return;
  grid.innerHTML = '';

  const photos = photoData[key] || [];
  photos.forEach((photo, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    img.alt = photo.name;
    img.loading = 'lazy';

    const caption = document.createElement('div');
    caption.className = 'photo-caption';
    caption.textContent = photo.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-photo no-print';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove photo';
    removeBtn.addEventListener('click', () => {
      photoData[key].splice(idx, 1);
      renderPhotoGrid(key);
      saveData();
    });

    thumb.appendChild(img);
    thumb.appendChild(caption);
    thumb.appendChild(removeBtn);
    grid.appendChild(thumb);
  });
}

// ── Risks & Gaps Table ────────────────────────────────────────
function bindRisksTable() {
  document.getElementById('addRiskRow').addEventListener('click', () => {
    if (!formData.risks) formData.risks = [];
    formData.risks.push({ risk: '', impact: '', likelihood: '', priority: '', notes: '' });
    renderRisksTable();
    saveData();
  });
}

function renderRisksTable() {
  const tbody = document.getElementById('riskTableBody');
  tbody.innerHTML = '';

  const rows = formData.risks || [];
  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><input type="text" placeholder="Describe risk…" value="${esc(row.risk)}" /></td>
      <td>
        <select>
          <option value="">—</option>
          <option ${row.impact === 'High' ? 'selected' : ''}>High</option>
          <option ${row.impact === 'Medium' ? 'selected' : ''}>Medium</option>
          <option ${row.impact === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </td>
      <td>
        <select>
          <option value="">—</option>
          <option ${row.likelihood === 'High' ? 'selected' : ''}>High</option>
          <option ${row.likelihood === 'Medium' ? 'selected' : ''}>Medium</option>
          <option ${row.likelihood === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </td>
      <td>
        <select>
          <option value="">—</option>
          <option ${row.priority === 'Critical' ? 'selected' : ''}>Critical</option>
          <option ${row.priority === 'High' ? 'selected' : ''}>High</option>
          <option ${row.priority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option ${row.priority === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </td>
      <td><input type="text" placeholder="Additional notes…" value="${esc(row.notes)}" /></td>
      <td class="no-print"><button class="remove-row-btn" title="Remove row">&times;</button></td>
    `;

    const [riskIn, , , , notesIn] = tr.querySelectorAll('input');
    const [impactSel, likelihoodSel, prioritySel] = tr.querySelectorAll('select');

    riskIn.addEventListener('input', () => { formData.risks[idx].risk = riskIn.value; saveData(); });
    notesIn.addEventListener('input', () => { formData.risks[idx].notes = notesIn.value; saveData(); });
    impactSel.addEventListener('change', () => { formData.risks[idx].impact = impactSel.value; saveData(); });
    likelihoodSel.addEventListener('change', () => { formData.risks[idx].likelihood = likelihoodSel.value; saveData(); });
    prioritySel.addEventListener('change', () => { formData.risks[idx].priority = prioritySel.value; saveData(); });

    tr.querySelector('.remove-row-btn').addEventListener('click', () => {
      formData.risks.splice(idx, 1);
      renderRisksTable();
      saveData();
    });

    tbody.appendChild(tr);
  });
}

// ── Recommendations ───────────────────────────────────────────
function bindRecommendations() {
  document.querySelectorAll('[data-add-rec]').forEach(btn => {
    const level = btn.dataset.addRec;
    btn.addEventListener('click', () => {
      const key = `s12_${level}`;
      if (!formData[key]) formData[key] = [];
      formData[key].push('');
      renderRecommendations(level);
      saveData();
    });
  });
}

function renderRecommendations(level) {
  const key = `s12_${level}`;
  const container = document.getElementById(`rec${capitalize(level)}`);
  if (!container) return;
  container.innerHTML = '';

  const items = formData[key] || [];
  items.forEach((text, idx) => {
    const div = document.createElement('div');
    div.className = 'rec-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Describe recommendation…';
    input.value = text;
    input.addEventListener('input', () => {
      formData[key][idx] = input.value;
      saveData();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-rec no-print';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => {
      formData[key].splice(idx, 1);
      renderRecommendations(level);
      saveData();
    });

    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);

    // focus new items
    if (idx === items.length - 1 && text === '') {
      setTimeout(() => input.focus(), 50);
    }
  });
}

// ── Sidebar ───────────────────────────────────────────────────
function bindSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const toggleBtn = document.getElementById('sidebarToggle');

  mobileBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

  // close sidebar on nav click (mobile)
  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
  });
}

function observeSections() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const num = id.replace('s', '');
        document.querySelectorAll('.nav-item').forEach(link => {
          link.classList.toggle('active', link.dataset.section === num);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  document.querySelectorAll('.form-section').forEach(sec => observer.observe(sec));
}

// ── Actions ───────────────────────────────────────────────────
function bindActions() {
  // Print / Export PDF
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  // Clear modal
  const modal = document.getElementById('clearModal');
  document.getElementById('clearBtn').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('cancelClear').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('confirmClear').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PHOTOS_KEY);
    formData = {};
    photoData = {};
    modal.classList.remove('open');
    location.reload();
  });

  // Close modal on overlay click
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
