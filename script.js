document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    const showAddReminderModalButton = document.getElementById('show-add-reminder-modal');
    const addReminderModal = document.getElementById('add-reminder-modal');
    const closeModalButton = document.querySelector('#add-reminder-modal .close-button');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderDate = document.getElementById('reminder-date');
    const reminderTime = document.getElementById('reminder-time');
    const reminderIdHidden = document.getElementById('reminder-id-hidden'); // For editing
    const cancelReminderButton = document.getElementById('cancel-reminder');

    const remindersList = document.getElementById('reminders');
    const emptyListMessage = document.getElementById('empty-list-message');

    const remindersKey = 'pockitReminders'; // Key for localStorage

    // --- Initial Load ---
    loadReminders();
    updateEmptyListVisibility();

    // --- Event Listeners ---

    // Show the Add/Edit Reminder modal
    showAddReminderModalButton.addEventListener('click', () => {
        // Reset form for adding new reminder
        reminderForm.reset();
        reminderIdHidden.value = ''; // Clear hidden ID for new reminder
        // Set default date/time for convenience (current date, 15 mins from now)
        const now = new Date();
        const future = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
        reminderDate.value = future.toISOString().split('T')[0]; // YYYY-MM-DD
        reminderTime.value = future.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

        addReminderModal.style.display = 'block'; // Show modal
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
        event.preventDefault(); // Prevent default form submission

        const id = reminderIdHidden.value || Date.now().toString(); // Use existing ID or generate new
        const text = reminderText.value.trim();
        const date = reminderDate.value;
        const time = reminderTime.value;

        if (text && date && time) {
            saveOrUpdateReminder(id, text, date, time);
            addReminderModal.style.display = 'none'; // Hide modal after saving
        } else {
            alert('Please fill in all reminder details!');
        }
    });

    // Handle clicks within the reminders list (for Delete/Edit)
    remindersList.addEventListener('click', (event) => {
        const listItem = event.target.closest('li'); // Find the closest list item
        if (!listItem) return; // Not a click on a list item

        const reminderId = listItem.dataset.reminderId;

        // --- Delete Confirmation ---
        if (event.target.classList.contains('delete-button')) {
            if (confirm('Are you sure you want to delete this reminder?')) {
                deleteReminder(reminderId);
                listItem.remove(); // Remove from DOM
                updateEmptyListVisibility();
            }
        }
        // --- Edit Reminder ---
        else if (event.target.classList.contains('edit-button')) {
            const reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];
            const reminderToEdit = reminders.find(r => r.id === reminderId);

            if (reminderToEdit) {
                reminderIdHidden.value = reminderToEdit.id;
                reminderText.value = reminderToEdit.text;
                reminderDate.value = reminderToEdit.date;
                reminderTime.value = reminderToEdit.time;
                addReminderModal.style.display = 'block'; // Show modal for editing
            }
        }
    });

    // --- Core Functions ---

    function loadReminders() {
        const storedReminders = localStorage.getItem(remindersKey);
        if (storedReminders) {
            const reminders = JSON.parse(storedReminders);
            // Sort reminders by date and time
            reminders.sort((a, b) => {
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA - dateTimeB;
            });
            reminders.forEach(reminder => {
                addReminderToDOM(reminder);
            });
        }
    }

    function saveOrUpdateReminder(id, text, date, time) {
        const newReminder = { id, text, date, time };
        let reminders = JSON.parse(localStorage.getItem(remindersKey)) || [];

        const existingIndex = reminders.findIndex(r => r.id === id);

        if (existingIndex > -1) {
            // Update existing reminder
            reminders[existingIndex] = newReminder;
            // Remove old DOM element to re-add it sorted
            const oldElement = document.querySelector(`li[data-reminder-id="${id}"]`);
            if (oldElement) oldElement.remove();
        } else {
            // Add new reminder
            reminders.push(newReminder);
        }

        saveReminders(reminders);
        // Re-render all reminders to ensure correct sorting
        remindersList.innerHTML = ''; // Clear current list
        loadReminders(); // Reload and re-sort
        updateEmptyListVisibility();
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

        const reminderDateTimeSpan = document.createElement('span');
        // Format date and time for better readability
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const displayDate = new Date(`${reminder.date}T${reminder.time}`).toLocaleString(undefined, options);
        reminderDateTimeSpan.textContent = ` (${displayDate})`;
        reminderDateTimeSpan.classList.add('reminder-datetime');

        reminderDetails.appendChild(reminderTextSpan);
        reminderDetails.appendChild(reminderDateTimeSpan);

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