document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const showAddReminderModalButton = document.getElementById('show-add-reminder-modal');
    const addReminderModal = document.getElementById('add-reminder-modal');
    const closeModalButton = document.querySelector('#add-reminder-modal .close-button');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderDate = document.getElementById('reminder-date');
    const reminderTime = document.getElementById('reminder-time');
    const reminderTagInput = document.getElementById('reminder-tag');
    const availableTagsDatalist = document.getElementById('tags');
    const reminderIdHidden = document.getElementById('reminder-id-hidden');
    const cancelReminderButton = document.getElementById('cancel-reminder');

    const remindersList = document.getElementById('reminders');
    const emptyListMessage = document.getElementById('empty-list-message');

    const searchInput = document.getElementById('search-reminders');

    const tagFilterToggle = document.getElementById('tag-filter-toggle');
    const tagFilterMenu = document.getElementById('tag-filter-menu');

    // Undo Pop-up Elements
    const undoCompletePopup = document.getElementById('undo-complete-popup');
    const undoReminderTextSpan = document.getElementById('undo-reminder-text');
    const undoButton = document.getElementById('undo-button');
    let lastCompletedReminderId = null;

    const remindersKey = 'pockitReminders';

    // --- State Variables ---
    let selectedTags = ['all'];
    let currentSearchTerm = '';


    // --- Initial Load ---
    loadAndRenderReminders();
    renderTagCheckboxes();
    setInterval(loadAndRenderReminders, 60 * 1000); // Re-render reminders every minute

    // --- Event Listeners ---

    // Show the Add/Edit Reminder modal
    showAddReminderModalButton.addEventListener('click', () => {
        reminderForm.reset();
        reminderIdHidden.value = '';
        reminderDate.value = '';
        reminderTime.value = '';
        reminderTagInput.value = ''; // Clear input for new reminder
        populateAvailableTagsDatalist();
        addReminderModal.classList.add('show');
        reminderText.focus();
    });

    // Close modal via 'x' button
    closeModalButton.addEventListener('click', () => {
        addReminderModal.classList.remove('show');
    });

    // Close modal via 'Cancel' button
    cancelReminderButton.addEventListener('click', () => {
        addReminderModal.classList.remove('show');
    });

    // Close modal if clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target === addReminderModal) {
            addReminderModal.classList.remove('show');
        }
        if (!tagFilterMenu.contains(event.target) && event.target !== tagFilterToggle) {
            tagFilterMenu.classList.remove('tag-filter-menu-show');
            tagFilterToggle.classList.remove('active');
        }
    });

    // Handle form submission (Add or Edit Reminder)
    reminderForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const id = reminderIdHidden.value || Date.now().toString();
        const text = reminderText.value.trim();
        const date = reminderDate.value;
        const time = reminderTime.value;
        // NEW: Parse comma-separated tags into an array
        const tagInputString = reminderTagInput.value.trim();
        const tags = tagInputString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');

        // If no tags are provided, default to ['all']
        if (tags.length === 0) {
            tags.push('all');
        }

        if (!text) {
            alert('Reminder text is required!');
            return;
        }

        if ((date && !time) || (!date && time)) {
            alert('Please provide both date AND time, or neither.');
            return;
        }

        saveOrUpdateReminder(id, text, date, time, tags); // Pass tags array
        addReminderModal.classList.remove('show'); // Hide modal after save
    });

    // Handle clicks within the reminders list (for Delete/Edit/Complete)
    remindersList.addEventListener('click', (event) => {
        const listItem = event.target.closest('li');
        if (!listItem) return;

        const reminderId = listItem.dataset.reminderId;

        // --- Delete Confirmation ---
        if (event.target.classList.contains('delete-button')) {
            if (confirm('Are you sure you want to delete this reminder?')) {
                deleteReminder(reminderId);
                loadAndRenderReminders();
                renderTagCheckboxes();
            }
        }
        // --- Edit Reminder ---
        else if (event.target.classList.contains('edit-button')) {
            const reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
            const reminderToEdit = reminders.find(r => r.id === reminderId);

            if (reminderToEdit) {
                reminderIdHidden.value = reminderToEdit.id;
                reminderText.value = reminderToEdit.text;
                reminderDate.value = reminderToEdit.date || '';
                reminderTime.value = reminderToEdit.time || '';
                // NEW: Join tags array back into a comma-separated string for display
                reminderTagInput.value = (reminderToEdit.tags || []).join(', ');
                populateAvailableTagsDatalist();
                addReminderModal.classList.add('show'); // Show modal for edit
                reminderText.focus();
            }
        }
        // --- Toggle Completion via Button ---
        else if (event.target.classList.contains('complete-button')) {
            toggleCompletion(reminderId);
        }
    });

    // Event listener for Undo button in the popup
    undoButton.addEventListener('click', () => {
        if (lastCompletedReminderId) {
            toggleCompletion(lastCompletedReminderId);
            hideUndoPopup();
        }
    });

    // Event Listener for Tag Filter Toggle Button
    tagFilterToggle.addEventListener('click', () => {
        tagFilterMenu.classList.toggle('tag-filter-menu-show');
        tagFilterToggle.classList.toggle('active');
        renderTagCheckboxes(); // Re-render checkboxes just in case new tags were added since last open
    });

    // Event Listener for Tag Checkbox Changes
    tagFilterMenu.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox' && event.target.dataset.tag) {
            const clickedTag = event.target.dataset.tag;

            if (clickedTag === 'all') {
                selectedTags = ['all']; // If 'all' is clicked, clear others and select only 'all'
            } else {
                // If any other tag is clicked, remove 'all' if it's there
                selectedTags = selectedTags.filter(tag => tag !== 'all');

                if (event.target.checked) {
                    selectedTags.push(clickedTag);
                } else {
                    selectedTags = selectedTags.filter(tag => tag !== clickedTag);
                }

                // If no tags are selected, default back to 'all'
                if (selectedTags.length === 0) {
                    selectedTags.push('all');
                }
            }

            renderTagCheckboxes(); // Re-render checkboxes to update their checked state
            loadAndRenderReminders(); // Re-render reminders with new filter
        }
    });

    // Event Listener for Search Input
    searchInput.addEventListener('input', (event) => {
        currentSearchTerm = event.target.value.trim().toLowerCase();
        loadAndRenderReminders();
    });


    // --- Core Functions ---

    function loadAndRenderReminders() {
        const storedReminders = localStorage.getItem(remindersKey);
        let reminders = storedReminders ? JSON.parse(storedReminders) : [];

        // NEW: Backward Compatibility & Normalization for Tags
        reminders = reminders.map(reminder => {
            // If it has old 'tag' property but no 'tags' array
            if (typeof reminder.tag !== 'undefined' && !reminder.tags) {
                const processedTag = reminder.tag.trim().toLowerCase();
                reminder.tags = processedTag ? [processedTag] : ['all'];
                delete reminder.tag; // Remove old single tag property
            }
            // Ensure 'tags' is always an array, and contains 'all' if empty
            if (!reminder.tags || !Array.isArray(reminder.tags) || reminder.tags.length === 0) {
                reminder.tags = ['all'];
            }
            // Normalize existing tags to lowercase and remove duplicates/empty
            reminder.tags = Array.from(new Set(
                reminder.tags.map(t => t.trim().toLowerCase()).filter(t => t !== '')
            ));
            // Ensure 'all' is present if no other tags exist (or if it was explicitly added)
            if (reminder.tags.length === 0 || (reminder.tags.length === 1 && reminder.tags[0] === '')) {
                reminder.tags = ['all'];
            }

            if (typeof reminder.completed === 'undefined') {
                reminder.completed = false;
            }
            return reminder;
        });
        saveReminders(reminders); // Save back to localStorage to update structure

        // --- Filtering Reminders (Tags then Search) ---
        let filteredReminders = reminders;

        // 1. Filter by Tag(s)
        if (!selectedTags.includes('all')) { // Only filter if 'all' is NOT selected
            // NEW: Filter if ANY of the reminder's tags are in selectedTags
            filteredReminders = filteredReminders.filter(r =>
                selectedTags.some(selectedTag => r.tags.includes(selectedTag))
            );
        }

        // 2. Filter by Search Term (case-insensitive)
        if (currentSearchTerm) {
            filteredReminders = filteredReminders.filter(r =>
                r.text.toLowerCase().includes(currentSearchTerm) ||
                // NEW: Search across all tags of the reminder
                r.tags.some(tag => tag.toLowerCase().includes(currentSearchTerm))
            );
        }

        // Sort reminders
        filteredReminders.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;

            const hasDateTimeA = a.date && a.time;
            const hasDateTimeB = b.date && b.time;

            if (hasDateTimeA && !hasDateTimeB) return -1;
            if (!hasDateTimeA && hasDateTimeB) return 1;

            if (hasDateTimeA && hasDateTimeB) {
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA - dateTimeB;
            } else {
                return parseInt(a.id) - parseInt(b.id);
            }
        });

        remindersList.innerHTML = '';
        if (filteredReminders.length === 0 && currentSearchTerm === '' && selectedTags.includes('all')) {
             emptyListMessage.style.display = 'block'; // Show empty message if no reminders at all
             remindersList.appendChild(emptyListMessage); // Ensure it's in the list
        } else if (filteredReminders.length === 0) {
             emptyListMessage.style.display = 'block'; // Show if filters/search yield no results
             emptyListMessage.textContent = "No reminders match your current filters or search term.";
             remindersList.appendChild(emptyListMessage);
        } else {
             emptyListMessage.style.display = 'none';
             emptyListMessage.textContent = "No reminders yet. Add one to get started!"; // Reset message
             filteredReminders.forEach(reminder => {
                 addReminderToDOM(reminder);
             });
        }
        updateEmptyListVisibility(); // Call this to ensure message is hidden/shown correctly based on *actual* children after render.
    }


    // NEW: SaveOrUpdateReminder now accepts a 'tags' array
    function saveOrUpdateReminder(id, text, date, time, tags) {
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        const existingIndex = reminders.findIndex(r => r.id === id);

        // Ensure tags array is clean and contains 'all' if empty
        const processedTags = tags.length === 0 ? ['all'] : tags;

        if (existingIndex > -1) {
            reminders[existingIndex] = {
                ...reminders[existingIndex],
                text,
                date: date || '',
                time: time || '',
                tags: processedTags // Save the array of tags
            };
        } else {
            const newReminder = { id, text, date: date || '', time: time || '', completed: false, tags: processedTags };
            reminders.push(newReminder);
        }

        saveReminders(reminders);
        loadAndRenderReminders();
        renderTagCheckboxes();
    }

    function toggleCompletion(id) {
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        const reminderIndex = reminders.findIndex(r => r.id === id);

        if (reminderIndex > -1) {
            const currentReminder = reminders[reminderIndex];
            currentReminder.completed = !currentReminder.completed;

            saveReminders(reminders);
            loadAndRenderReminders();

            if (currentReminder.completed) {
                lastCompletedReminderId = currentReminder.id;
                showUndoPopup(currentReminder.text);
            } else {
                hideUndoPopup();
            }
        }
    }

    function deleteReminder(idToDelete) {
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        reminders = reminders.filter(reminder => reminder.id !== idToDelete);
        saveReminders(reminders);
    }


    function saveReminders(reminders) {
        localStorage.setItem(remindersKey, JSON.stringify(reminders));
    }

    function addReminderToDOM(reminder) {
        const listItem = document.createElement('li');
        listItem.dataset.reminderId = reminder.id;

        if (reminder.completed) {
            listItem.classList.add('completed-reminder');
        }

        const reminderDetails = document.createElement('div');
        reminderDetails.classList.add('reminder-details');

        const reminderTextSpan = document.createElement('span');
        reminderTextSpan.textContent = reminder.text;
        reminderTextSpan.classList.add('reminder-text');

        reminderDetails.appendChild(reminderTextSpan);

        if (reminder.date) {
            const reminderDateTimeSpan = document.createElement('span');
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            const displayDateString = reminder.time ? `${reminder.date}T${reminder.time}` : `${reminder.date}T00:00`;
            const displayDate = new Date(displayDateString).toLocaleString(undefined, options);
            reminderDateTimeSpan.textContent = ` (${displayDate})`;
            reminderDateTimeSpan.classList.add('reminder-datetime');
            reminderDetails.appendChild(reminderDateTimeSpan);
        }

        // NEW: Loop through all tags to display them
        if (reminder.tags && reminder.tags.length > 0) {
            reminder.tags.forEach(tag => {
                // Only display if tag is not 'all' OR if 'all' is the only tag
                if (tag !== 'all' || (reminder.tags.length === 1 && tag === 'all')) {
                    const reminderTagSpan = document.createElement('span');
                    reminderTagSpan.textContent = tag;
                    reminderTagSpan.classList.add('reminder-tag');
                    reminderDetails.appendChild(reminderTagSpan);
                }
            });
        }


        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('reminder-actions');

        const completeButton = document.createElement('button');
        completeButton.textContent = reminder.completed ? 'Undo' : 'Complete';
        completeButton.classList.add('complete-button');
        completeButton.classList.add('action-button');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');
        editButton.classList.add('action-button');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.classList.add('action-button');


        actionsDiv.appendChild(completeButton);
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);

        listItem.appendChild(reminderDetails);
        listItem.appendChild(actionsDiv);

        // --- Highlighting Logic (only apply if not completed) ---
        if (!reminder.completed && reminder.date && reminder.time) {
            const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
            const now = new Date();

            if (reminderDateTime < now) {
                listItem.classList.add('past-reminder');
            } else if (reminderDateTime > now && reminderDateTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
                listItem.classList.add('upcoming-reminder');
            }
        }

        remindersList.appendChild(listItem);
    }

    function updateEmptyListVisibility() {
        const hasVisibleReminders = remindersList.children.length > 0 && Array.from(remindersList.children).some(child => child.id !== 'empty-list-message');

        if (!hasVisibleReminders) {
            emptyListMessage.style.display = 'block';
            if (currentSearchTerm !== '' || !selectedTags.includes('all') || (JSON.parse(localStorage.getItem(remindersKey)) || []).length > 0) {
                emptyListMessage.textContent = "No reminders match your current filters or search term.";
            } else {
                emptyListMessage.textContent = "No reminders yet. Add one to get started!";
            }
            if (!remindersList.contains(emptyListMessage)) { // Ensure it's only added once
                 remindersList.appendChild(emptyListMessage);
            }
        } else {
            emptyListMessage.style.display = 'none';
        }
    }


    // --- Tag Checkbox Management Functions ---
    function getUniqueTags() {
        const reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        const tags = new Set();
        tags.add('all'); // Always include 'all' as an option

        reminders.forEach(reminder => {
            // NEW: Iterate through reminder.tags array
            if (reminder.tags && Array.isArray(reminder.tags)) {
                reminder.tags.forEach(tag => {
                    if (tag.trim() !== '') {
                        tags.add(tag.trim().toLowerCase());
                    }
                });
            }
        });

        const uniqueTagsArray = Array.from(tags).sort((a, b) => {
            if (a === 'all') return -1; // 'all' always first
            if (b === 'all') return 1;
            return a.localeCompare(b); // Alphabetical sort for others
        });
        return uniqueTagsArray;
    }

    function renderTagCheckboxes() {
        const uniqueTags = getUniqueTags();
        tagFilterMenu.innerHTML = ''; // Clear existing checkboxes

        uniqueTags.forEach(tag => {
            const isAllOption = (tag === 'all');
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('tag-filter-menu-item');
            if (isAllOption) {
                itemDiv.classList.add('all-tags-option');
            }

            const checkboxId = `tag-checkbox-${tag}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.dataset.tag = tag;

            // Determine if the checkbox should be checked based on selectedTags array
            checkbox.checked = selectedTags.includes(tag);

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            tagFilterMenu.appendChild(itemDiv);
        });
    }

    function populateAvailableTagsDatalist() {
        const uniqueTags = getUniqueTags();
        availableTagsDatalist.innerHTML = '';
        uniqueTags.forEach(tag => {
            if (tag !== 'all') { // Don't suggest 'all' in the input datalist
                const option = document.createElement('option');
                option.value = tag.charAt(0).toUpperCase() + tag.slice(1);
                availableTagsDatalist.appendChild(option);
            }
        });
    }


    // --- Undo Complete Pop-up Logic ---
    let undoPopupTimeout;

    function showUndoPopup(reminderText) {
        undoReminderTextSpan.textContent = `"${reminderText}"`;
        undoCompletePopup.style.display = 'flex';
        setTimeout(() => {
            undoCompletePopup.classList.add('show');
        }, 50);

        clearTimeout(undoPopupTimeout);
        undoPopupTimeout = setTimeout(hideUndoPopup, 10000);
    }

    function hideUndoPopup() {
        undoCompletePopup.classList.remove('show');
        setTimeout(() => {
            undoCompletePopup.style.display = 'none';
            lastCompletedReminderId = null;
        }, 500);
    }


    // --- Feedback Pop-up Logic ---
    const feedbackPopup = document.getElementById('feedback-popup');
    const dismissFeedbackButton = document.querySelector('.feedback-dismiss-button');
    const feedbackLastDismissedKey = 'pockitFeedbackLastDismissed';
    const FOUR_WEEKS_IN_MS = 4 * 7 * 24 * 60 * 60 * 1000;

    function showFeedbackPopup() {
        const lastDismissed = localStorage.getItem(feedbackLastDismissedKey);
        const now = Date.now();

        if (!lastDismissed || (now - parseInt(lastDismissed) > FOUR_WEEKS_IN_MS)) {
            feedbackPopup.style.display = 'block';
            setTimeout(() => {
                feedbackPopup.classList.add('show');
            }, 50);
        } else {
            feedbackPopup.style.display = 'none';
            feedbackPopup.classList.remove('show');
        }
    }

    function dismissFeedbackPopup() {
        const originalParagraph = feedbackPopup.querySelector('p');
        const originalText = originalParagraph.textContent;
        const originalActions = feedbackPopup.querySelector('.feedback-popup-actions');

        originalParagraph.textContent = "Okay, we'll ask again in 4 weeks. Thanks!";
        originalActions.style.display = 'none';

        setTimeout(() => {
            feedbackPopup.classList.remove('show');
            setTimeout(() => {
                originalParagraph.textContent = originalText;
                originalActions.style.display = 'flex';
            }, 300);
        }, 5000);

        localStorage.setItem(feedbackLastDismissedKey, Date.now().toString());
    }

    dismissFeedbackButton.addEventListener('click', dismissFeedbackPopup);
    setTimeout(showFeedbackPopup, 5000);
});