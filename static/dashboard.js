let subjects = [];
let activeSubjectId = null;
let pendingDeleteAction = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchSubjectsData();
   
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('profile-dropdown');
        const btn = document.getElementById('profile-btn');
        if (btn && dropdown) {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        }
    });
});

async function fetchSubjectsData() {
    try {
        const response = await fetch('/api/subjects');
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        subjects = await response.json();
        renderDashboard();
        
        if (activeSubjectId && document.getElementById('subject-folder-view').style.display === 'block') {
            renderFolder();
        }
    } catch (error) {
        console.error('Error fetching subjects:', error);
    }
}

function toggleProfileMenu() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function goBackToDashboard() {
    activeSubjectId = null;
    document.getElementById('subject-folder-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    renderDashboard();
}

function openFolder(id) {
    activeSubjectId = id;
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('subject-folder-view').style.display = 'block';
    renderFolder();
}

function openConfirmModal(title, message, actionCallback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    pendingDeleteAction = actionCallback;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    pendingDeleteAction = null;
}

document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirmModal);
document.getElementById('confirm-proceed-btn').addEventListener('click', () => {
    if (pendingDeleteAction) {
        pendingDeleteAction();
    }
    closeConfirmModal();
});

function openSubjectModal(isEdit = false, targetId = null) {
    const titleElement = document.getElementById('subject-modal-title');
    const idField = document.getElementById('edit-subject-id');
    const inputField = document.getElementById('subject-title-input');

    if (isEdit) {
        titleElement.textContent = "Edit Subject";
        const subjectIdToEdit = targetId || activeSubjectId;
        const subject = subjects.find(s => s.id === subjectIdToEdit);
        idField.value = subject.id;
        inputField.value = subject.title;
    } else {
        titleElement.textContent = "Add New Subject";
        document.getElementById('add-subject-form').reset();
        idField.value = "";
    }
   
    document.getElementById('subject-modal').style.display = 'flex';
}

function closeSubjectModal() {
    document.getElementById('subject-modal').style.display = 'none';
    document.getElementById('add-subject-form').reset();
}

function openMaterialModal(isEdit = false, matId = null) {
    const modalTitle = document.getElementById('material-modal-title');
    const form = document.getElementById('material-form');
   
    if (isEdit) {
        modalTitle.textContent = "Edit Link";
        const subject = subjects.find(s => s.id === activeSubjectId);
        const material = subject.materials.find(m => m.id === matId);
       
        document.getElementById('edit-material-id').value = material.id;
        document.getElementById('material-title').value = material.title;
        document.getElementById('material-url').value = material.url;
        document.getElementById('material-category').value = material.category;
    } else {
        modalTitle.textContent = "Add New Link";
        form.reset();
        document.getElementById('edit-material-id').value = "";
    }
   
    document.getElementById('material-modal').style.display = 'flex';
}

function closeMaterialModal() {
    document.getElementById('material-modal').style.display = 'none';
    document.getElementById('material-form').reset();
}

function renderDashboard() {
    const grid = document.getElementById('subjects-grid');
    const emptyState = document.getElementById('empty-dashboard-state');
   
    grid.innerHTML = '';
   
    if (subjects.length === 0) {
        emptyState.style.display = 'flex';
        grid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
       
        subjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.innerHTML = `
                <h3>${sub.title}</h3>
                <p>${sub.materials.length} Links Saved</p>
                <div class="card-actions" style="flex-wrap: wrap;">
                    <button class="card-btn" onclick="openFolder(${sub.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        Open
                    </button>
                    <button class="card-btn" onclick="openSubjectModal(true, ${sub.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit
                    </button>
                    <button class="card-btn" onclick="requestDeleteSubject(${sub.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

function renderFolder() {
    const subject = subjects.find(s => s.id === activeSubjectId);
    if (!subject) return;
    
    document.getElementById('current-subject-title').textContent = subject.title;
   
    const categories = ['Notes-Books', 'Tutorials-Links', 'Assignments-Projects', 'Others'];
   
    categories.forEach(cat => {
        const listContainer = document.getElementById(`list-${cat}`);
        listContainer.innerHTML = '';
       
        const materials = subject.materials.filter(m => m.category === cat);
       
        if (materials.length === 0) {
            listContainer.innerHTML = `<div class="empty-cat">No files added yet</div>`;
        } else {
            materials.forEach(mat => {
                const item = document.createElement('div');
                item.className = 'material-item';
                item.innerHTML = `
                    <div class="material-info">
                        <svg viewBox="0 0 24 24" class="link-icon"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        <span class="material-title" title="${mat.title}">${mat.title}</span>
                    </div>
                    <div class="mat-actions">
                        <button class="mat-btn" title="View" onclick="window.open('${mat.url}', '_blank')">
                            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </button>
                        <button class="mat-btn" title="Edit" onclick="openMaterialModal(true, ${mat.id})">
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="mat-btn" title="Delete" onclick="requestDeleteMaterial(${mat.id})">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        }
    });
}

document.getElementById('add-subject-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idField = document.getElementById('edit-subject-id').value;
    const title = document.getElementById('subject-title-input').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
   
    try {
        if (idField) {
            await fetch(`/api/subjects/${idField}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
        } else {
            await fetch('/api/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
        }
        await fetchSubjectsData();
    } catch (error) {
        console.error('Error saving subject:', error);
    } finally {
        submitBtn.disabled = false;
        closeSubjectModal();
    }
});

function requestDeleteSubject(id) {
    openConfirmModal(
        "Delete Subject",
        "Are you sure you want to delete this subject and all its links?",
        async () => {
            try {
                await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
                await fetchSubjectsData();
            } catch (error) {
                console.error('Error deleting subject:', error);
            }
        }
    );
}

document.getElementById('material-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idField = document.getElementById('edit-material-id').value;
    const title = document.getElementById('material-title').value;
    const url = document.getElementById('material-url').value;
    const category = document.getElementById('material-category').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
   
    try {
        if (idField) {
            await fetch(`/api/materials/${idField}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, url, category })
            });
        } else {
            await fetch('/api/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, url, category, subject_id: activeSubjectId })
            });
        }
        await fetchSubjectsData();
    } catch (error) {
        console.error('Error saving material:', error);
    } finally {
        submitBtn.disabled = false;
        closeMaterialModal();
    }
});

function requestDeleteMaterial(matId) {
    openConfirmModal(
        "Delete Link",
        "Are you sure you want to remove this link from the folder?",
        async () => {
            try {
                await fetch(`/api/materials/${matId}`, { method: 'DELETE' });
                await fetchSubjectsData();
            } catch (error) {
                console.error('Error deleting material:', error);
            }
        }
    );
}