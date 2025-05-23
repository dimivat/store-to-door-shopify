document.addEventListener('DOMContentLoaded', () => {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');
  const mainContent = document.getElementById('main-content');
  
  // Check if user is already authenticated
  const isAuthenticated = localStorage.getItem('storeToDoerAuthenticated');
  
  if (isAuthenticated === 'true') {
    // User is already authenticated, hide login overlay and show main content
    loginOverlay.classList.add('hidden');
    mainContent.classList.remove('hidden');
  } else {
    // User is not authenticated, show login overlay and hide main content
    loginOverlay.classList.remove('hidden');
    mainContent.classList.add('hidden');
  }
  
  // Handle login form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    
    // Check if password is correct
    if (password === 'james') {
      // Password is correct, authenticate user
      localStorage.setItem('storeToDoerAuthenticated', 'true');
      
      // Hide login overlay and show main content
      loginOverlay.classList.add('hidden');
      mainContent.classList.remove('hidden');
      
      // Clear password input and error message
      passwordInput.value = '';
      errorMessage.textContent = '';
    } else {
      // Password is incorrect, show error message
      errorMessage.textContent = 'Incorrect password. Please try again.';
      
      // Clear password input
      passwordInput.value = '';
    }
  });
  
  // Add a logout function that can be called from the console if needed
  window.logout = () => {
    localStorage.removeItem('storeToDoerAuthenticated');
    loginOverlay.classList.remove('hidden');
    mainContent.classList.add('hidden');
  };
});
