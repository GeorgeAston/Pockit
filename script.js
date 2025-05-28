document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const showAddReminderModalButton = document.getElementById('show-add-reminder-modal');
    const addReminderModal = document.getElementById('add-reminder-modal');
    const closeModalButton = document.querySelector('#add-reminder-modal .close-button');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderDate = document.getElementById('reminder-date');
    const reminderTime = document.getElementById('reminder-time');
    const reminderIdHidden = document.getElementById('reminder-id-hidden');
    const cancelReminderButton = document.getElementById('cancel-reminder');

    const remindersList = document.getElementById('reminders');
    const emptyListMessage = document.getElementById('empty-list-message');

    const remindersKey = 'pockitReminders';

    // --- Initial Load ---
    loadAndRenderReminders();
    // Re-render reminders every minute to update highlights
    setInterval(loadAndRenderReminders, 60 * 1000);

    // --- Event Listeners ---

    // Show the Add/Edit Reminder modal
    showAddReminderModalButton.addEventListener('click', () => {
        reminderForm.reset();
        reminderIdHidden.value = '';
        // Clear date and time by default for optional input
        reminderDate.value = '';
        reminderTime.value = '';
        addReminderModal.style.display = 'block';
        reminderText.focus(); // Focus on the text input for immediate typing
    });

    // Close modal via 'x' button or 'Cancel'
    closeModalButton.addEventListener('click', () => {
        addReminderModal.style.display = 'none';
    });

    cancelReminderButton.addEventListener('click', () => {
        addReminderModal.style.display = 'none';
    });

    // Close modal if clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target === addReminderModal) {
            addReminderModal.style.display = 'none';
        }
    });

    // Handle form submission (Add or Edit Reminder)
    reminderForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const id = reminderIdHidden.value || Date.now().toString(); // Use existing ID or generate new
        const text = reminderText.value.trim();
        const date = reminderDate.value; // Can be empty
        const time = reminderTime.value; // Can be empty

        if (!text) {
            alert('Reminder text is required!');
            return;
        }

        // If date is provided, time should ideally be too, and vice versa
        if ((date && !time) || (!date && time)) {
            alert('Please provide both date AND time, or neither.');
            return;
        }

        saveOrUpdateReminder(id, text, date, time);
        addReminderModal.style.display = 'none';
    });

    // Handle clicks within the reminders list (for Delete/Edit)
    remindersList.addEventListener('click', (event) => {
        const listItem = event.target.closest('li');
        if (!listItem) return;

        const reminderId = listItem.dataset.reminderId;

        // --- Delete Confirmation ---
        if (event.target.classList.contains('delete-button')) {
            if (confirm('Are you sure you want to delete this reminder?')) {
                deleteReminder(reminderId);
                loadAndRenderReminders(); // Re-render to update the list
            }
        }
        // --- Edit Reminder ---
        else if (event.target.classList.contains('edit-button')) {
            const reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
            const reminderToEdit = reminders.find(r => r.id === reminderId);

            if (reminderToEdit) {
                reminderIdHidden.value = reminderToEdit.id;
                reminderText.value = reminderToEdit.text;
                reminderDate.value = reminderToEdit.date || ''; // Ensure empty string if not set
                reminderTime.value = reminderToEdit.time || ''; // Ensure empty string if not set
                addReminderModal.style.display = 'block';
                reminderText.focus();
            }
        }
    });

    // --- Core Functions ---

    // Loads reminders from localStorage, sorts them, and renders them to the DOM
    function loadAndRenderReminders() {
        const storedReminders = localStorage.getItem(remindersKey);
        let reminders = storedReminders ? JSON.parse(storedReminders) : [];

        // Sort reminders:
        // 1. Reminders with date/time first
        // 2. Then by date/time (earliest first)
        // 3. Reminders without date/time come last, sorted by their ID (creation time)
        reminders.sort((a, b) => {
            const hasDateTimeA = a.date && a.time;
            const hasDateTimeB = b.date && b.time;

            if (hasDateTimeA && !hasDateTimeB) return -1; // A has date/time, B doesn't -> A comes first
            if (!hasDateTimeA && hasDateTimeB) return 1;  // B has date/time, A doesn't -> B comes first

            if (hasDateTimeA && hasDateTimeB) {
                // Both have date/time, sort by actual date/time
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA - dateTimeB;
            } else {
                // Neither has date/time, sort by creation ID (which is Date.now().toString())
                return parseInt(a.id) - parseInt(b.id);
            }
        });

        remindersList.innerHTML = ''; // Clear current list before re-rendering
        reminders.forEach(reminder => {
            addReminderToDOM(reminder);
        });
        updateEmptyListVisibility();
    }


    function saveOrUpdateReminder(id, text, date, time) {
        // Ensure date and time are stored as empty strings if not provided
        const newReminder = { id, text, date: date || '', time: time || '' };
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];

        const existingIndex = reminders.findIndex(r => r.id === id);

        if (existingIndex > -1) {
            // Update existing reminder
            reminders[existingIndex] = newReminder;
        } else {
            // Add new reminder
            reminders.push(newReminder);
        }

        saveReminders(reminders);
        loadAndRenderReminders(); // Re-render to ensure correct sorting and highlighting
    }

    function saveReminders(reminders) {
        localStorage.setItem(remindersKey, JSON.stringify(reminders));
    }

    function addReminderToDOM(reminder) {
        const listItem = document.createElement('li');
        listItem.dataset.reminderId = reminder.id;

        const reminderDetails = document.createElement('div');
        reminderDetails.classList.add('reminder-details');

        const reminderTextSpan = document.createElement('span');
        reminderTextSpan.textContent = reminder.text;
        reminderTextSpan.classList.add('reminder-text');

        reminderDetails.appendChild(reminderTextSpan);

        // Only add date/time span if date is provided
        if (reminder.date) {
            const reminderDateTimeSpan = document.createElement('span');
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            // Use current date if reminder time is missing to form a valid Date object for display
            const displayDateString = reminder.time ? `${reminder.date}T${reminder.time}` : `${reminder.date}T00:00`;
            const displayDate = new Date(displayDateString).toLocaleString(undefined, options);
            reminderDateTimeSpan.textContent = ` (${displayDate})`;
            reminderDateTimeSpan.classList.add('reminder-datetime');
            reminderDetails.appendChild(reminderDateTimeSpan);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('reminder-actions');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');

        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);

        listItem.appendChild(reminderDetails);
        listItem.appendChild(actionsDiv);

        // --- Highlighting Logic ---
        if (reminder.date && reminder.time) {
            const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
            const now = new Date();

            if (reminderDateTime < now) {
                listItem.classList.add('past-reminder');
            } else if (reminderDateTime > now && reminderDateTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
                // Highlight as upcoming if within next 24 hours
                listItem.classList.add('upcoming-reminder');
            }
        }
        // If no date/time, no specific highlight class added

        remindersList.appendChild(listItem);
    }

    function deleteReminder(idToDelete) {
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
        reminders = reminders.filter(reminder => reminder.id !== idToDelete);
        saveReminders(reminders);
    }

    function updateEmptyListVisibility() {
        if (remindersList.children.length === 0) {
            emptyListMessage.style.display = 'block';
        } else {
            emptyListMessage.style.display = 'none';
        }
    }
});