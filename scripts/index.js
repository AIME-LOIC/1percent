document.addEventListener('DOMContentLoaded',()=>{
    const loader=document.getElementById('loader');
    setTimeout(()=>{loader.style.opacity='0';setTimeout(()=>{loader.style.display='none';},800);},1200);

    // Theme toggle
    const toggleMobile=document.getElementById('theme-toggle');
    const toggleNav=document.getElementById('nav-theme-toggle');

    function updateThemeUI(){
        const isDark=document.body.classList.contains('dark-mode');
        const iconHtml = isDark ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
        if(toggleMobile) toggleMobile.innerHTML = iconHtml;
        if(toggleNav) toggleNav.innerHTML = iconHtml;
        if(toggleMobile) toggleMobile.setAttribute('aria-pressed', String(isDark));
        if(toggleNav) toggleNav.setAttribute('aria-pressed', String(isDark));
    }

    function toggleTheme(){
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        updateThemeUI();
        showToast('info', document.body.classList.contains('dark-mode') ? 'Switched to dark mode' : 'Switched to light mode', 2000);
    }

    if(toggleMobile) toggleMobile.addEventListener('click', toggleTheme);
    if(toggleNav) toggleNav.addEventListener('click', toggleTheme);

    // Hamburger
    const hamburger=document.getElementById('hamburger');
    const navLinks=document.getElementById('nav-links');
    hamburger.addEventListener('click',()=>{
        const active = navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', String(active));
    });

    // Toaster system
    const toastContainer = document.getElementById('toast-container');
    function showToast(type='info', message='', timeout=4000){
        const toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.innerHTML = type === 'success' ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : (type === 'error' ? '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' : '<i class="fa-solid fa-info" aria-hidden="true"></i>');
        const text = document.createElement('div');
        text.innerText = message;
        toast.appendChild(icon);
        toast.appendChild(text);
        toastContainer.appendChild(toast);

        // auto remove
        const removeAfter = setTimeout(()=> {
            toast.style.animation = 'toast-out 0.35s forwards';
            setTimeout(()=> toast.remove(), 350);
        }, timeout);

        // click to remove
        toast.addEventListener('click', () => {
            clearTimeout(removeAfter);
            toast.style.animation = 'toast-out 0.35s forwards';
            setTimeout(() => toast.remove(), 350);
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if(contactForm){
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Sending...';
            fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {'Accept': 'application/json'}
            }).then(response => {
                if (response.ok) {
                    showToast('success', 'Message sent successfully!', 3000);
                    contactForm.reset();
                } else {
                    showToast('error', 'Failed to send message. Please try again.', 3000);
                }
            }).catch(() => {
                showToast('error', 'An error occurred. Please try again.', 3000);
            }).finally(()=>{
                submitBtn.disabled = false;
                submitBtn.innerText = 'Send Message';
            });
        });
    }   
    updateThemeUI();
    setTimeout(()=>showToast('info','Welcome to 1% Digital Solutions!',3000),1500); 
});