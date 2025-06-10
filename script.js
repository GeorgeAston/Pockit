document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const showAddReminderModalButton = document.getElementById('show-add-reminder-modal');
    const addReminderModal = document.getElementById('add-reminder-modal');
    const closeModalButton = document.querySelector('#add-reminder-modal .close-button');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderDate = document.getElementById('reminder-date');
    const reminderTime = document.getElementById('reminder-time');
    const reminderTagInput = document.getElementById('reminder-tag'); // NEW
    const availableTagsDatalist = document.getElementById('tags'); // NEW
    const reminderIdHidden = document.getElementById('reminder-id-hidden');
    const cancelReminderButton = document.getElementById('cancel-reminder');

    const remindersList = document.getElementById('reminders');
    const emptyListMessage = document.getElementById('empty-list-message');
    const tagFiltersContainer = document.getElementById('tag-filters'); // NEW

    // Undo Pop-up Elements
    const undoCompletePopup = document.getElementById('undo-complete-popup');
    const undoReminderTextSpan = document.getElementById('undo-reminder-text');
    const undoButton = document.getElementById('undo-button');
    let lastCompletedReminderId = null; // Store ID for undo functionality

    const remindersKey = 'pockitReminders';

    // --- NEW: Current Filter Tag ---
    let currentFilterTag = 'all'; // Default filter

    // --- Initial Load ---
    loadAndRenderReminders();
    renderTagFilters(); // NEW: Render tag filters on initial load
    // Re-render reminders every minute to update highlights
    setInterval(loadAndRenderReminders, 60 * 1000);

    // --- Event Listeners ---

    // Show the Add/Edit Reminder modal
    showAddReminderModalButton.addEventListener('click', () => {
        reminderForm.reset();
        reminderIdHidden.value = '';
        reminderDate.value = '';
        reminderTime.value = '';
        reminderTagInput.value = '';
        populateAvailableTagsDatalist();
        // CHANGED: Use classList.add() to show the modal
        console.log('GO FUCK YOURSELF');
        addReminderModal.classList.add('show'); // This will apply display: flex; and opacity: 1;
        reminderText.focus();
    });

    // Close modal via 'x' button
    closeModalButton.addEventListener('click', () => {
        // CHANGED: Use classList.remove() to hide the modal
        addReminderModal.classList.remove('show');
    });

    // Close modal via 'Cancel' button
    cancelReminderButton.addEventListener('click', () => {
        // CHANGED: Use classList.remove() to hide the modal
        addReminderModal.classList.remove('show');
    });

    // Close modal if clicking outside the content
    /*window.addEventListener('click', (event) => {
        if (event.target === addReminderModal) {
            // CHANGED: Use classList.remove() to hide the modal
            addReminderModal.classList.remove('show');
        }
    });*/

    // Handle form submission (Add or Edit Reminder)
    reminderForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const id = reminderIdHidden.value || Date.now().toString();
        const text = reminderText.value.trim();
        const date = reminderDate.value;
        const time = reminderTime.value;
        const tag = reminderTagInput.value.trim().toLowerCase() || 'all'; // NEW: Get tag, default to 'all'

        if (!text) {
            alert('Reminder text is required!');
            return;
        }

        if ((date && !time) || (!date && time)) {
            alert('Please provide both date AND time, or neither.');
            return;
        }

        saveOrUpdateReminder(id, text, date, time, tag); // NEW: Pass tag
        // CHANGED: Use classList.remove() to hide the modal
        addReminderModal.classList.remove('show'); // CHANGED: Use classList.remove() to hide the modal
        reminderForm.reset(); // Reset form fields after submission
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
                renderTagFilters(); // NEW: Re-render tag filters after deletion
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
                reminderTagInput.value = reminderToEdit.tag || 'all'; // NEW: Set tag value
                populateAvailableTagsDatalist(); // NEW: Populate datalist for editing
                addReminderModal.classList.add('show'); // CHANGED: Use classList.add() to show the modal
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

    // --- NEW: Event Listener for Tag Filters ---
    tagFiltersContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tag-filter-button')) {
            currentFilterTag = event.target.dataset.tag;
            loadAndRenderReminders(); // Re-render reminders with new filter
            renderTagFilters(); // Update active state of tag buttons
        }
    });

    // --- Core Functions ---

    function loadAndRenderReminders() {
        const storedReminders = localStorage.getItem(remindersKey);
        let reminders = storedReminders ? JSON.parse(storedReminders) : [];

        // --- Backward Compatibility for Tags (CRUCIAL) ---
        // Ensure all loaded reminders have a 'tag' property, defaulting to 'all'
        reminders = reminders.map(reminder => {
            if (typeof reminder.tag === 'undefined' || reminder.tag === null || reminder.tag.trim() === '') {
                reminder.tag = 'all'; // Assign 'all' if tag is missing, null, or empty
            } else {
                reminder.tag = reminder.tag.toLowerCase(); // Ensure tags are always lowercase
            }
            // Also ensure 'completed' property exists for older reminders
            if (typeof reminder.completed === 'undefined') {
                reminder.completed = false;
            }
            return reminder;
        });
        saveReminders(reminders); // Save back to localStorage to update old reminders with 'all' tag

        // --- Filtering Reminders ---
        const filteredReminders = currentFilterTag === 'all'
            ? reminders
            : reminders.filter(r => r.tag === currentFilterTag);


        // Sort reminders:
        // 1. Incomplete reminders first, sorted by date/time (earliest first)
        // 2. Then completed reminders, sorted by date/time (or creation time if no date/time)
        filteredReminders.sort((a, b) => { // Use filteredReminders for sorting
            // Completed items always go to the bottom
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;

            // If both are completed or both are not completed, sort by date/time
            const hasDateTimeA = a.date && a.time;
            const hasDateTimeB = b.date && b.time;

            if (hasDateTimeA && !hasDateTimeB) return -1;
            if (!hasDateTimeA && hasDateTimeB) return 1;

            if (hasDateTimeA && hasDateTimeB) {
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA - dateTimeB;
            } else {
                // If neither has date/time (or both completed without date/time), sort by ID (creation time)
                return parseInt(a.id) - parseInt(b.id);
            }
        });

        remindersList.innerHTML = ''; // Clear current list before re-rendering
        filteredReminders.forEach(reminder => { // Use filteredReminders for rendering
            addReminderToDOM(reminder);
        });
        updateEmptyListVisibility();
    }


    function saveOrUpdateReminder(id, text, date, time, tag) { // NEW: added tag parameter
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        const existingIndex = reminders.findIndex(r => r.id === id);

        const processedTag = tag.trim().toLowerCase() || 'all'; // Ensure new/updated tags are lowercase and not empty

        if (existingIndex > -1) {
            // Update existing reminder, preserve 'completed' status
            reminders[existingIndex] = {
                ...reminders[existingIndex], // Keep existing properties like 'completed'
                text,
                date: date || '',
                time: time || '',
                tag: processedTag // NEW: Save tag
            };
        } else {
            // Add new reminder, default to not completed
            const newReminder = { id, text, date: date || '', time: time || '', completed: false, tag: processedTag }; // NEW: Add tag
            reminders.push(newReminder);
        }

        saveReminders(reminders);
        loadAndRenderReminders();
        renderTagFilters(); // NEW: Re-render tag filters after saving
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

        // --- NEW: Display Reminder Tag ---
        if (reminder.tag && reminder.tag !== 'all') { // Only display if tag exists and is not 'all'
            const reminderTagSpan = document.createElement('span');
            reminderTagSpan.textContent = reminder.tag;
            reminderTagSpan.classList.add('reminder-tag');
            reminderDetails.appendChild(reminderTagSpan);
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
        if (remindersList.children.length === 0) {
            emptyListMessage.style.display = 'block';
        } else {
            emptyListMessage.style.display = 'none';
        }
    }

    // --- NEW: Tag Management Functions ---
    function getUniqueTags() {
        const reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        // Ensure all reminders have a tag before collecting unique ones
        const processedReminders = reminders.map(r => {
            if (typeof r.tag === 'undefined' || r.tag === null || r.tag.trim() === '') {
                r.tag = 'all';
            } else {
                r.tag = r.tag.toLowerCase(); // Ensure tags are lowercase
            }
            return r;
        });

        const tags = new Set(['all']); // Start with 'all' as a default tag
        processedReminders.forEach(reminder => {
            if (reminder.tag) {
                tags.add(reminder.tag);
            }
        });
        return Array.from(tags).sort(); // Convert Set to Array and sort alphabetically
    }

    function renderTagFilters() {
        const uniqueTags = getUniqueTags();
        tagFiltersContainer.innerHTML = ''; // Clear existing buttons

        uniqueTags.forEach(tag => {
            const button = document.createElement('button');
            button.classList.add('tag-filter-button');
            button.textContent = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize first letter for display
            button.dataset.tag = tag; // Store raw tag in dataset for filtering
            if (tag === currentFilterTag) {
                button.classList.add('active');
            }
            tagFiltersContainer.appendChild(button);
        });
    }

    function populateAvailableTagsDatalist() {
        const uniqueTags = getUniqueTags();
        availableTagsDatalist.innerHTML = '';
        uniqueTags.forEach(tag => {
            if (tag !== 'all') { // Don't suggest 'all' in the input datalist
                const option = document.createElement('option');
                option.value = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize for display
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
                feedbackPopup.style.display = 'none';
            }, 300);
        }, 5000);

        localStorage.setItem(feedbackLastDismissedKey, Date.now().toString());
    }

    dismissFeedbackButton.addEventListener('click', dismissFeedbackPopup);
    setTimeout(showFeedbackPopup, 5000);
});