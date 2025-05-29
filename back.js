document.addEventListener('DOMContentLoaded', () => {
    // Select all elements with the class 'js-back-button'
    const backButtons = document.querySelectorAll('.jsback');

    backButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the default link behavior (e.g., navigating to #)

            // Attempt to go back in browser history
            if (window.history.length > 1) { // Check if there's history to go back to
                window.history.back();
            } else {
                // Fallback for cases where there's no history (e.g., direct access to privacy.html/help.html)
                // or if it's the first page in the PWA's navigation context.
                window.location.href = 'index.html';
            }
        });
    });
});