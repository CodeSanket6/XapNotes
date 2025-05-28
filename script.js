// --- 1. DOM Elements & Quill.js Initialization ---
const mainWrapper = document.querySelector('.main-wrapper');
const noteTitleInput = document.getElementById('note-title');
const editorContainer = document.getElementById('editor-container');
const closeEditorBtn = document.getElementById('close-editor-btn');
const notesGrid = document.getElementById('notes-grid');
const currentNoteIdInput = document.getElementById('current-note-id');
const editorOverlay = document.getElementById('editor-overlay');
const addNoteFab = document.getElementById('add-note-fab');
const editorDateSpan = document.getElementById('editor-date');
const editorCharCountSpan = document.getElementById('editor-char-count');
const noteFolderSelect = document.getElementById('note-folder-select');

const filterAllBtn = document.getElementById('filter-all-btn');
const filterFolderBtn = document.getElementById('filter-folder-btn');
const filterBar = document.getElementById('filter-bar');

// Multi-Select Top Bar DOM elements
const multiSelectBar = document.getElementById('multi-select-bar');
const exitMultiSelectBtn = document.getElementById('exit-multi-select-btn');
const selectedCountSpan = document.getElementById('selected-count');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');


// Folder Filter Overlay DOM elements
const folderFilterOverlay = document.getElementById('folder-filter-overlay');
const closeFolderFilterBtn = document.getElementById('close-folder-filter-btn');
const folderFilterList = document.getElementById('folder-filter-list');
const newFolderNameInput = document.getElementById('new-folder-name'); 
const addFolderBtn = document.getElementById('add-folder-btn');


// Settings related DOM elements
const settingsIcon = document.getElementById('settings-icon');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const fontSizeOptions = document.getElementById('font-size-options');
const sortOptions = document.getElementById('sort-options');
const layoutOptions = document.getElementById('layout-options');

// Folder management list in settings
const settingsFolderList = document.getElementById('settings-folder-list');


// Initialize Quill editor
const quill = new Quill(editorContainer, {
    theme: 'snow',
    placeholder: 'Start typing...',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ]
    }
});

// Update character count on text change
quill.on('text-change', () => {
    const textLength = quill.getText().trim().length;
    editorCharCountSpan.textContent = `${textLength} characters`;
});

// --- 2. Local Storage Keys & Data Structure ---
const LOCAL_STORAGE_NOTES_KEY = 'mySimpleNotes_notes';
const LOCAL_STORAGE_SETTINGS_KEY = 'mySimpleNotes_settings';
const LOCAL_STORAGE_FOLDERS_KEY = 'mySimpleNotes_folders';

let notes = [];
let appSettings = {
    fontSize: 'medium',
    sortBy: 'modified',
    layout: 'grid',
    activeFolderId: 'all'
};
let folders = [];

// State for multi-select mode
let isMultiSelectMode = false;
let selectedNoteIds = new Set();
// NEW: Flag to indicate if a long press just occurred
let longPressTriggered = false; 


// --- 3. Helper Functions for Local Storage & IDs ---
function loadNotesFromLocalStorage() {
    const storedNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
    return storedNotes ? JSON.parse(storedNotes) : [];
}

function saveNotesToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(notes));
}

function loadSettingsFromLocalStorage() {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
        try {
            const parsedSettings = JSON.parse(storedSettings);
            appSettings = { ...appSettings, ...parsedSettings };
        } catch (e) {
            console.error("Error parsing settings from Local Storage, using defaults:", e);
        }
    }
}

function saveSettingsToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(appSettings));
}

function loadFoldersFromLocalStorage() {
    const storedFolders = localStorage.getItem(LOCAL_STORAGE_FOLDERS_KEY);
    return storedFolders ? JSON.parse(storedFolders) : [];
}

function saveFoldersToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_FOLDERS_KEY, JSON.stringify(folders));
}

function generateUniqueId() {
    return Date.now();
}

function getFolderName(folderId) {
    if (folderId === 'all') return 'All Notes';
    const folder = folders.find(f => f.id == folderId);
    return folder ? folder.name : 'Uncategorized';
}


// --- 4. Core Note Management & UI Functions ---

// Multi-Select Mode Functions
function enterMultiSelectMode() {
    isMultiSelectMode = true;
    selectedNoteIds.clear(); // Clear any existing selection
    updateMultiSelectUI();
    mainWrapper.classList.add('multi-select-active');
    // Apply multi-select-mode class to all notes currently in view
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.add('multi-select-mode');
        card.classList.remove('selected'); // Ensure none are initially selected visually
    });
    // Hide FAB while in multi-select mode
    addNoteFab.style.display = 'none';
}

function exitMultiSelectMode() {
    isMultiSelectMode = false;
    selectedNoteIds.clear();
    updateMultiSelectUI();
    mainWrapper.classList.remove('multi-select-active');
    // Remove multi-select classes from all notes
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('multi-select-mode', 'selected');
    });
    // Show FAB again
    addNoteFab.style.display = 'flex'; // Use 'flex' because it was originally a flex item
}

function toggleNoteSelection(noteId) {
    if (selectedNoteIds.has(noteId)) {
        selectedNoteIds.delete(noteId);
    } else {
        selectedNoteIds.add(noteId);
    }
    updateMultiSelectUI();
    // Update visual state of just the clicked card
    const noteCardElement = notesGrid.querySelector(`.note-card[data-id="${noteId}"]`);
    if (noteCardElement) {
        noteCardElement.classList.toggle('selected', selectedNoteIds.has(noteId));
    }
}

function updateMultiSelectUI() {
    selectedCountSpan.textContent = `${selectedNoteIds.size} selected`;
    if (selectedNoteIds.size > 0) {
        multiSelectBar.classList.add('visible');
    } else {
        multiSelectBar.classList.remove('visible');
        // Optional: If you want to exit multi-select mode when no notes are selected
        // if (isMultiSelectMode) {
        //     exitMultiSelectMode();
        // }
    }
}

function deleteSelectedNotes() {
    if (selectedNoteIds.size === 0) {
        alert('No notes selected for deletion.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${selectedNoteIds.size} selected notes?`)) {
        notes = notes.filter(note => !selectedNoteIds.has(note.id));
        saveNotesToLocalStorage();
        exitMultiSelectMode(); // Exit multi-select mode after deletion
        renderNotes(appSettings.activeFolderId); // Re-render notes
    }
}


/**
 * Opens the editor modal for a new note or for editing an existing one.
 * @param {object} [noteData] - Optional: The note object to pre-fill the editor for editing.
 */
function openEditor(noteData = null) {
    // Prevent opening editor if in multi-select mode
    if (isMultiSelectMode) return;

    clearEditor();
    populateFolderSelect(noteData ? noteData.folderId : appSettings.activeFolderId);

    if (noteData) {
        noteTitleInput.value = noteData.title;
        quill.root.innerHTML = noteData.content;
        currentNoteIdInput.value = noteData.id;
    }

    const displayDate = noteData && noteData.date ? new Date(noteData.date) : new Date();
    editorDateSpan.textContent = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    editorCharCountSpan.textContent = `${quill.getText().trim().length} characters`;

    editorOverlay.classList.add('visible');
    noteTitleInput.focus();
}

/**
 * Closes the editor modal. This will now also trigger the autosave logic.
 */
function closeEditor() {
    handleSaveNote();

    editorOverlay.classList.remove('visible');
    clearEditor();
    renderNotes(appSettings.activeFolderId);
}

/**
 * Clears the editor fields and resets for a new note.
 */
function clearEditor() {
    noteTitleInput.value = '';
    quill.setText('');
    currentNoteIdInput.value = '';
    editorDateSpan.textContent = '';
    editorCharCountSpan.textContent = '0 characters';
    noteFolderSelect.value = 'all';
}

/**
 * Renders all notes from the 'notes' array to the UI grid/list.
 * @param {string} filterId - The ID of the folder to filter notes by.
 */
let currentFilter = 'all';
function renderNotes(filterId = 'all') {
    notesGrid.innerHTML = '';
    appSettings.activeFolderId = filterId;
    saveSettingsToLocalStorage();

    let notesToRender = [...notes];

    // Apply filter
    if (filterId !== 'all') {
        notesToRender = notesToRender.filter(note => note.folderId == filterId);
    }

    // Apply sorting based on appSettings
    notesToRender.sort((a, b) => {
        const dateA = new Date(a.date || a.id);
        const dateB = new Date(b.date || b.id);
        if (appSettings.sortBy === 'modified' || appSettings.sortBy === 'created') {
            return dateB.getTime() - dateA.getTime(); // Newest first
        }
        return 0;
    });

    // Apply layout class
    notesGrid.classList.remove('grid-view', 'list-view');
    notesGrid.classList.add(`${appSettings.layout}-view`);

    // Update filter bar active button visual state
    filterAllBtn.classList.remove('active');
    filterFolderBtn.classList.remove('active');
    if (filterId === 'all') {
        filterAllBtn.classList.add('active');
        filterFolderBtn.textContent = '📁';
    } else {
        filterFolderBtn.classList.add('active');
        filterFolderBtn.textContent = getFolderName(filterId);
    }


    if (notesToRender.length === 0) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('no-notes-message');
        if (filterId !== 'all') {
            messageDiv.innerHTML = `<p>No notes in "${getFolderName(filterId)}" folder yet.</p>`;
        } else {
            messageDiv.innerHTML = '<p>No notes yet. Tap the <span class="fab-plus">+</span> button to create one!</p>';
        }
        notesGrid.appendChild(messageDiv);
        return;
    }

    notesToRender.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.classList.add('note-card');
        noteCard.dataset.id = note.id;

        // Add checkbox for multi-select
        const checkbox = document.createElement('div');
        checkbox.classList.add('select-checkbox');
        checkbox.innerHTML = '&#10003;'; // Checkmark symbol
        noteCard.appendChild(checkbox);

        // Apply selected class if note is currently selected
        if (selectedNoteIds.has(note.id)) {
            noteCard.classList.add('selected');
        }
        // Apply multi-select-mode class to note card itself if active
        if (isMultiSelectMode) {
            noteCard.classList.add('multi-select-mode');
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const previewText = tempDiv.textContent || tempDiv.innerText || '';

        const noteDate = note.date ? new Date(note.date) : new Date(note.id);
        const formattedDate = noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const noteContentHTML = `
            <h3>${note.title}</h3>
            <div class="note-content-preview">${previewText}</div>
            <span class="note-date">${formattedDate}</span>
        `;

        noteCard.insertAdjacentHTML('beforeend', noteContentHTML);


        // --- NEW/MODIFIED: Event Listeners for Edit / Multi-Select ---
        let pressTimer;
        const LONG_PRESS_TIME = 500; // milliseconds

        // Touchstart / Mousedown for long press detection
        noteCard.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                longPressTriggered = true; // Set flag
                if (!isMultiSelectMode) {
                    enterMultiSelectMode();
                }
                toggleNoteSelection(note.id);
            }, LONG_PRESS_TIME);
        }, { passive: true });

        noteCard.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                pressTimer = setTimeout(() => {
                    longPressTriggered = true; // Set flag
                    if (!isMultiSelectMode) {
                        enterMultiSelectMode();
                    }
                    toggleNoteSelection(note.id);
                }, LONG_PRESS_TIME);
            }
        });

        // Clear timer on touch/mouse end/move
        const clearPressTimer = () => {
            clearTimeout(pressTimer);
            // Do NOT reset longPressTriggered here, it's checked by click listener
        };
        noteCard.addEventListener('touchend', clearPressTimer);
        noteCard.addEventListener('touchcancel', clearPressTimer);
        noteCard.addEventListener('mouseup', clearPressTimer);
        noteCard.addEventListener('mouseleave', clearPressTimer);

        // Click handler: Fires AFTER mousedown/mouseup or touchstart/touchend
        noteCard.addEventListener('click', (e) => {
            // Prevent default click actions after a context menu or long press
            if (longPressTriggered) {
                longPressTriggered = false; // Reset for next interaction
                e.preventDefault(); // Stop default click behavior
                e.stopPropagation(); // Stop event bubbling
                return; 
            }

            // If not in multi-select mode, a quick click opens editor
            if (!isMultiSelectMode) {
                editNote(note.id);
            } else {
                // If in multi-select mode, a click toggles selection
                toggleNoteSelection(note.id);
            }
        });

        // Right-click (contextmenu) handler: Enters multi-select
        noteCard.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default browser context menu
            longPressTriggered = true; // Treat right-click as a "long press" equivalent
            if (!isMultiSelectMode) {
                enterMultiSelectMode();
            }
            toggleNoteSelection(note.id);
        });
        // --- END MODIFIED EVENT LISTENERS ---

        notesGrid.appendChild(noteCard);
    });
}

/**
 * Handles autosaving, creating, updating, or deleting a note based on content.
 * Called automatically when editor closes.
 */
function handleSaveNote() {
    let title = noteTitleInput.value.trim();
    const content = quill.root.innerHTML.trim();
    const currentNoteId = currentNoteIdInput.value;
    const selectedFolderId = noteFolderSelect.value;

    const isNewNote = !currentNoteId;
    const isEditorEffectivelyEmpty = !title && quill.getText().trim() === '';

    if (isEditorEffectivelyEmpty) {
        if (!isNewNote) {
            deleteNote(currentNoteId, true);
        }
        return;
    }

    if (!title) {
        const firstLineOfContent = quill.getText().trim().split('\n')[0];
        title = firstLineOfContent ? firstLineOfContent.substring(0, 50) + (firstLineOfContent.length > 50 ? '...' : '') : "Untitled Note";
    }

    if (currentNoteId) {
        const noteIndex = notes.findIndex(note => note.id == currentNoteId);
        if (noteIndex !== -1) {
            notes[noteIndex].title = title;
            notes[noteIndex].content = content;
            notes[noteIndex].folderId = selectedFolderId;
        }
    } else {
        const newNote = {
            id: generateUniqueId(),
            title: title,
            content: content,
            date: new Date().toISOString(),
            folderId: selectedFolderId
        };
        notes.unshift(newNote);
    }

    saveNotesToLocalStorage();
}

/**
 * Populates the editor with an existing note for editing.
 * @param {number} id - The ID of the note to edit.
 */
function editNote(id) {
    const noteToEdit = notes.find(note => note.id == id);
    if (noteToEdit) {
        openEditor(noteToEdit);
        const noteDate = new Date(noteToEdit.date || noteToEdit.id);
        editorDateSpan.textContent = noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        noteFolderSelect.value = noteToEdit.folderId || 'all';
    }
}

/**
 * Deletes a note from the array and Local Storage.
 * @param {number} id - The ID of the note to delete.
 * @param {boolean} [skipConfirm=false] - If true, skips the confirmation dialog.
 */
function deleteNote(id, skipConfirm = false) {
    if (skipConfirm || confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(note => !selectedNoteIds.has(note.id) || note.id === id); // Filter out selected IDs OR just the passed ID
        // If not in multi-select mode, only delete the specific ID.
        // If in multi-select mode, delete ALL selected notes.
        // The deleteSelectedNotes() handles multi-delete. This single delete should probably be only for implicit delete.

        // Correct logic for single delete vs multi-delete
        if (!isMultiSelectMode) { // If not in multi-select, delete only this one
            notes = notes.filter(note => note.id != id);
        } else { // If in multi-select, delete all selected (called by deleteSelectedNotes)
            // This deleteNote function might be called by deleteSelectedNotes(), so we keep it.
            // But if it's called standalone from e.g. contextmenu, it deletes just one.
            notes = notes.filter(note => !selectedNoteIds.has(note.id)); // If it's being called from multi-select
            selectedNoteIds.clear(); // Clear selection after multi-delete
        }

        saveNotesToLocalStorage();
        updateMultiSelectUI(); // Update count
        renderNotes(appSettings.activeFolderId);
        if (currentNoteIdInput.value == id) {
            clearEditor();
            editorOverlay.classList.remove('visible');
        }
    }
}

// --- Folder Management Functions ---

function addFolder() {
    const newFolderName = newFolderNameInput.value.trim();
    if (!newFolderName) {
        alert('Folder name cannot be empty!');
        return;
    }
    if (folders.some(f => f.name.toLowerCase() === newFolderName.toLowerCase())) {
        alert('A folder with this name already exists!');
        return;
    }
    if (newFolderName.toLowerCase() === 'all notes' || newFolderName.toLowerCase() === 'uncategorized') {
        alert('"All Notes" or "Uncategorized" are reserved names. Please choose another.');
        return;
    }

    const newFolder = { id: generateUniqueId(), name: newFolderName };
    folders.push(newFolder);
    saveFoldersToLocalStorage();
    renderFoldersInSettings();
    populateFolderSelect();
    populateFolderFilterList();
    newFolderNameInput.value = '';
}

function renameFolder(folderId, newName) {
    const folder = folders.find(f => f.id == folderId);
    if (!folder) return false;

    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
        alert('Folder name cannot be empty!');
        return false;
    }
    if (trimmedNewName.toLowerCase() === 'all notes' || trimmedNewName.toLowerCase() === 'uncategorized') {
        alert('"All Notes" or "Uncategorized" are reserved names. Please choose another.');
        return false;
    }
    if (folders.some(f => f.id !== folderId && f.name.toLowerCase() === trimmedNewName.toLowerCase())) {
        alert('Another folder with this name already exists!');
        return false;
    }

    folder.name = trimmedNewName;
    saveFoldersToLocalStorage();
    renderFoldersInSettings();
    populateFolderSelect();
    populateFolderFilterList();
    renderNotes(appSettings.activeFolderId);
    return true;
}

function deleteFolder(folderId) {
    if (folderId === 'all') {
        alert('Cannot delete "All Notes" folder.');
        return;
    }

    if (confirm(`Are you sure you want to delete the folder "${getFolderName(folderId)}"? All notes in this folder will be moved to "All Notes".`)) {
        folders = folders.filter(f => f.id != folderId);
        notes.forEach(note => {
            if (note.folderId == folderId) {
                note.folderId = 'all';
            }
        });
        saveNotesToLocalStorage();
        saveFoldersToLocalStorage();

        if (appSettings.activeFolderId == folderId) {
            appSettings.activeFolderId = 'all';
            saveSettingsToLocalStorage();
        }

        renderFoldersInSettings();
        populateFolderSelect();
        populateFolderFilterList();
        renderNotes(appSettings.activeFolderId);
    }
}

function renderFoldersInSettings() {
    settingsFolderList.innerHTML = '';
    if (folders.length === 0) {
        const li = document.createElement('li');
        li.classList.add('folder-item', 'no-hover-effect');
        li.innerHTML = '<span class="folder-name">No custom folders.</span>';
        settingsFolderList.appendChild(li);
        return;
    }
    folders.forEach(folder => {
        const li = document.createElement('li');
        li.classList.add('folder-item');
        li.dataset.folderId = folder.id;

        const folderNameSpan = document.createElement('span');
        folderNameSpan.classList.add('folder-name');
        folderNameSpan.textContent = folder.name;
        folderNameSpan.addEventListener('click', (event) => {
            event.stopPropagation();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = folder.name;
            input.classList.add('folder-name-input');

            folderNameSpan.innerHTML = '';
            folderNameSpan.appendChild(input);
            folderNameSpan.classList.add('editing');

            input.focus();
            input.select();

            const saveRename = () => {
                const newName = input.value.trim();
                if (newName === folder.name || !newName) {
                    folderNameSpan.textContent = folder.name;
                } else {
                    if (!renameFolder(folder.id, newName)) {
                         folderNameSpan.textContent = folder.name;
                    } else {
                         folderNameSpan.textContent = newName;
                    }
                }
                folderNameSpan.classList.remove('editing');
            };

            input.addEventListener('blur', saveRename);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveRename();
                    input.blur();
                }
            });
        });

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('folder-actions');

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-folder-btn', 'icon-button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = `Delete "${folder.name}"`;
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteFolder(folder.id);
        });

        actionsDiv.appendChild(deleteBtn);
        li.appendChild(folderNameSpan);
        li.appendChild(actionsDiv);
        settingsFolderList.appendChild(li);
    });
}

function populateFolderSelect(selectedFolderId = null) {
    noteFolderSelect.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Notes';
    noteFolderSelect.appendChild(allOption);

    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        noteFolderSelect.appendChild(option);
    });

    if (selectedFolderId) {
        noteFolderSelect.value = selectedFolderId;
    } else {
        noteFolderSelect.value = appSettings.activeFolderId || 'all';
    }
}

function populateFolderFilterList() {
    folderFilterList.innerHTML = '';

    const allNotesItem = document.createElement('li');
    allNotesItem.classList.add('folder-item');
    allNotesItem.dataset.folderId = 'all';
    allNotesItem.textContent = 'All Notes';
    if (appSettings.activeFolderId === 'all') {
        allNotesItem.classList.add('active');
    }
    allNotesItem.addEventListener('click', () => {
        renderNotes('all');
        closeFolderFilter();
    });
    folderFilterList.appendChild(allNotesItem);


    folders.forEach(folder => {
        const li = document.createElement('li');
        li.classList.add('folder-item');
        li.dataset.folderId = folder.id;
        li.textContent = folder.name;
        if (appSettings.activeFolderId == folder.id) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => {
            renderNotes(folder.id);
            closeFolderFilter();
        });
        folderFilterList.appendChild(li);
    });
}

// Settings Modal functions
function openSettings() {
    settingsOverlay.classList.add('visible');
    renderFoldersInSettings();
    updateSettingsUI();
}

function closeSettings() {
    settingsOverlay.classList.remove('visible');
}

// Folder Filter Modal functions
function openFolderFilter() {
    populateFolderFilterList();
    folderFilterOverlay.classList.add('visible');
    newFolderNameInput.focus();
}

function closeFolderFilter() {
    folderFilterOverlay.classList.remove('visible');
    newFolderNameInput.value = '';
}


/**
 * Applies current app settings to the UI.
 */
function applySettings() {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${appSettings.fontSize}`);

    renderNotes(appSettings.activeFolderId);
    saveSettingsToLocalStorage();
}

/**
 * Updates the active class on settings buttons based on current appSettings.
 */
function updateSettingsUI() {
    fontSizeOptions.querySelectorAll('.setting-button').forEach(button => {
        if (button.dataset.fontSize === appSettings.fontSize) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    sortOptions.querySelectorAll('.setting-button').forEach(button => {
        if (button.dataset.sortBy === appSettings.sortBy) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    layoutOptions.querySelectorAll('.setting-button').forEach(button => {
        if (button.dataset.layout === appSettings.layout) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}


// --- 5. Event Listeners ---
closeEditorBtn.addEventListener('click', closeEditor); 
addNoteFab.addEventListener('click', () => openEditor());

// Filter button event listeners
filterAllBtn.addEventListener('click', () => {
    filterAllBtn.classList.add('active');
    filterFolderBtn.classList.remove('active');
    renderNotes('all');
});

filterFolderBtn.addEventListener('click', openFolderFilter);

// Settings event listeners
settingsIcon.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);

fontSizeOptions.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('.setting-button');
    if (clickedButton && clickedButton.dataset.fontSize) {
        appSettings.fontSize = clickedButton.dataset.fontSize;
        applySettings();
        updateSettingsUI();
    }
});

sortOptions.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('.setting-button');
    if (clickedButton && clickedButton.dataset.sortBy) {
        appSettings.sortBy = clickedButton.dataset.sortBy;
        applySettings();
        updateSettingsUI();
    }
});

layoutOptions.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('.setting-button');
    if (clickedButton && clickedButton.dataset.layout) {
        appSettings.layout = clickedButton.dataset.layout;
        applySettings();
        updateSettingsUI();
    }
});

// Folder management event listeners
addFolderBtn.addEventListener('click', addFolder);
newFolderNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addFolder();
    }
});

// Folder filter modal listeners
closeFolderFilterBtn.addEventListener('click', closeFolderFilter);

// Multi-select bar listeners
exitMultiSelectBtn.addEventListener('click', exitMultiSelectMode);
deleteSelectedBtn.addEventListener('click', deleteSelectedNotes);


// --- 6. Initial App Load ---
document.addEventListener('DOMContentLoaded', () => {
    notes = loadNotesFromLocalStorage();
    folders = loadFoldersFromLocalStorage();
    loadSettingsFromLocalStorage();
    applySettings(); // Applies layout and font size
    renderNotes(appSettings.activeFolderId); // Renders notes based on current filter/sort/layout

    // Ensure all modals are hidden on load
    editorOverlay.classList.remove('visible');
    settingsOverlay.classList.remove('visible');
    folderFilterOverlay.classList.remove('visible');
    multiSelectBar.classList.remove('visible');

    // Initial population for the editor folder select and filter list
    populateFolderSelect();
    populateFolderFilterList();
});
