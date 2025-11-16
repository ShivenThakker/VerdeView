document.addEventListener('DOMContentLoaded', () => {
    // --- Get All Potential Elements ---
    const loaderPage = document.getElementById('loader');
    const splashPage = document.getElementById('splash');
    const getStartedBtn = document.getElementById('getStartedBtn');
    
    // --- Logic for index.html (Loader & Splash) ---
    if (loaderPage && splashPage && getStartedBtn) {
        
        // Auto-transition from Loader to Splash Page
        setTimeout(() => {
            loaderPage.classList.add('animate-fade-out');
            
            setTimeout(() => {
                loaderPage.style.display = 'none';
                splashPage.classList.remove('hidden');
            }, 500); // Match animation duration

        }, 4500); // Loader delay

        // Manual transition from Splash to Tools page
        getStartedBtn.addEventListener('click', () => {
            // Add a fade-out effect
            splashPage.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            
            // Navigate after fade-out
            setTimeout(() => {
                window.location.href = 'tools.html';
            }, 500);
        });
    }
});