document.addEventListener('DOMContentLoaded', () => {
    const addReminderButton = document.getElementById('add-reminder-button');
    const remindersList = document.getElementById('reminders');
    const emptyListMessage = document.getElementById('empty-list-message');
    const remindersKey = 'pockitReminders';
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }

    loadReminders();
    updateEmptyListVisibility();

    addReminderButton.addEventListener('click', () => {
        const reminderText = prompt('Enter your reminder:');
        if (reminderText && reminderText.trim() !== '') {
            addReminder(reminderText);
        }
    });

    remindersList.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.classList.contains('delete-button')) {
            const listItem = event.target.parentNode;
            const reminderId = listItem.dataset.reminderId;
            deleteReminder(reminderId);
            listItem.remove();
            updateEmptyListVisibility();
        }
    });

    function loadReminders() {
        const storedReminders = localStorage.getItem(remindersKey);
        if (storedReminders) {
            const reminders = JSON.parse(storedReminders);
            reminders.forEach(reminder => {
                addReminderToDOM(reminder.text, reminder.id);
            });
        }
    }

    function saveReminders(reminders) {
        localStorage.setItem(remindersKey, JSON.stringify(reminders));
    }

    function addReminder(text) {
        const id = Date.now().toString(); // Simple unique ID
        const newReminder = { id, text };
        const storedReminders = localStorage.getItem(remindersKey);
        let reminders = storedReminders ? JSON.parse(storedReminders) : [];
        reminders.push(newReminder);
        saveReminders(reminders);
        addReminderToDOM(text, id);
        updateEmptyListVisibility();
    }

    function addReminderToDOM(text, id) {
        const listItem = document.createElement('li');
        listItem.dataset.reminderId = id;
        const span = document.createElement('span');
        span.textContent = text;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        listItem.appendChild(span);
        listItem.appendChild(deleteButton);
        remindersList.appendChild(listItem);
    }

    function deleteReminder(idToDelete) {
        const storedReminders = localStorage.getItem(remindersKey);
        if (storedReminders) {
            let reminders = JSON.parse(storedReminders);
            reminders = reminders.filter(reminder => reminder.id !== idToDelete);
            saveReminders(reminders);
        }
    }

    function updateEmptyListVisibility() {
        if (remindersList.children.length === 0) {
            emptyListMessage.style.display = 'block';
        } else {
            emptyListMessage.style.display = 'none';
        }
    }
});