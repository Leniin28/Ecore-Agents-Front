const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");

if (contactForm && contactMessage) {
    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        contactMessage.textContent = "Mensaje enviado correctamente (simulado).";
        contactForm.reset();
    });
}

function showQuoteMessage(event) {
    const messageId = event.currentTarget.dataset.messageTarget;
    const quoteMessage = document.getElementById(messageId);

    quoteMessage.textContent = "Plan agregado a cotización (simulado).";
}

const quoteButtons = document.querySelectorAll(".quote-button");

quoteButtons.forEach(function (quoteButton) {
    quoteButton.addEventListener("click", showQuoteMessage);
});

const USER_STORAGE_KEY = "ecoreUser";
const SESSION_STORAGE_KEY = "ecoreSession";

function readStoredUser(storageKey) {
    const storedUser = localStorage.getItem(storageKey);

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch (error) {
        localStorage.removeItem(storageKey);
        return null;
    }
}

function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const registerMessage = document.getElementById("register-message");
    const user = { name, email };

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.removeItem(SESSION_STORAGE_KEY);

    registerMessage.textContent = "Registro exitoso (simulado).";
    event.currentTarget.reset();
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const loginMessage = document.getElementById("login-message");
    const registeredUser = readStoredUser(USER_STORAGE_KEY);

    if (registeredUser && registeredUser.email !== email) {
        loginMessage.textContent = "El correo no coincide con el usuario registrado.";
        loginMessage.classList.add("message-error");
        return;
    }

    const sessionUser = registeredUser || {
        name: "Usuario demo",
        email
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.location.href = "profile.html";
}

function loadProfile() {
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");

    if (!profileName || !profileEmail) {
        return;
    }

    const sessionUser = readStoredUser(SESSION_STORAGE_KEY);

    if (!sessionUser) {
        window.location.replace("login.html");
        return;
    }

    profileName.textContent = sessionUser.name;
    profileEmail.textContent = sessionUser.email;
}

function handleLogout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.location.href = "index.html";
}

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");

if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
}

if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
}

if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
}

loadProfile();
