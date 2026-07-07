const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");
const CART_STORAGE_KEY = "ecoreCart";

function formatCurrency(amount) {
    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return `$${safeAmount.toLocaleString("es-MX")} MXN`;
}

function normalizeQuantity(quantity) {
    const parsedQuantity = Math.floor(Number(quantity));
    return Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
}

function getCart() {
    try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        const parsedCart = storedCart ? JSON.parse(storedCart) : [];

        if (!Array.isArray(parsedCart)) {
            return [];
        }

        return parsedCart.filter(function (item) {
            return item && item.id && item.name && Number.isFinite(Number(item.price));
        }).map(function (item) {
            return {
                id: String(item.id),
                name: String(item.name),
                type: item.type === "custom" ? "custom" : "predefined",
                price: Math.max(0, Number(item.price)),
                quantity: normalizeQuantity(item.quantity),
                modules: Array.isArray(item.modules) ? item.modules.map(String) : []
            };
        });
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
        updateCartCount();
        return true;
    } catch (error) {
        return false;
    }
}

function createCartItemId(type) {
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addToCart(item) {
    if (!item || !item.name || !Number.isFinite(Number(item.price))) {
        return false;
    }

    const cart = getCart();
    const quantity = normalizeQuantity(item.quantity);

    if (item.type === "predefined") {
        const existingItem = cart.find(function (cartItem) {
            return cartItem.type === "predefined" && cartItem.name === item.name;
        });

        if (existingItem) {
            existingItem.quantity += quantity;
            return saveCart(cart);
        }
    }

    cart.push({
        id: item.id || createCartItemId(item.type === "custom" ? "custom" : "predefined"),
        name: String(item.name),
        type: item.type === "custom" ? "custom" : "predefined",
        price: Math.max(0, Number(item.price)),
        quantity: quantity,
        modules: Array.isArray(item.modules) ? item.modules.map(String) : []
    });

    return saveCart(cart);
}

function updateCartCount() {
    const totalAgents = getCart().reduce(function (total, item) {
        return total + item.quantity;
    }, 0);

    document.querySelectorAll(".cart-count").forEach(function (cartCount) {
        cartCount.textContent = String(totalAgents);
        cartCount.setAttribute("aria-label", `${totalAgents} agentes en el carrito`);
    });
}

if (contactForm && contactMessage) {
    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        contactMessage.textContent = "Mensaje enviado correctamente (simulado).";
        contactForm.reset();
    });
}

function addPredefinedAgentToCart(event) {
    const button = event.currentTarget;
    const quantityInput = document.getElementById(button.dataset.quantityTarget);
    const message = document.getElementById(button.dataset.messageTarget);
    const quantity = normalizeQuantity(quantityInput ? quantityInput.value : 1);

    if (quantityInput) {
        quantityInput.value = String(quantity);
    }

    const wasAdded = addToCart({
        name: button.dataset.planName,
        type: "predefined",
        price: Number(button.dataset.planPrice),
        quantity: quantity,
        modules: []
    });

    if (message) {
        message.textContent = wasAdded
            ? "Agente agregado al carrito (simulado)."
            : "No fue posible guardar el agente en el carrito.";
    }
}

const planCartButtons = document.querySelectorAll(".plan-cart-button");

planCartButtons.forEach(function (planCartButton) {
    planCartButton.addEventListener("click", addPredefinedAgentToCart);
});

function updateCartQuantity(itemId, change) {
    const cart = getCart();
    const item = cart.find(function (cartItem) {
        return cartItem.id === itemId;
    });
    const quantityChange = Math.trunc(Number(change));

    if (!item || !Number.isFinite(quantityChange)) {
        return;
    }

    item.quantity = Math.max(1, item.quantity + quantityChange);
    saveCart(cart);
    renderCart();
}

function removeCartItem(itemId) {
    const updatedCart = getCart().filter(function (item) {
        return item.id !== itemId;
    });

    saveCart(updatedCart);
    renderCart();
}

function createCartMeta(label, value) {
    const row = document.createElement("p");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");

    labelElement.textContent = label;
    valueElement.textContent = value;
    row.append(labelElement, valueElement);
    return row;
}

function renderCart() {
    const cartItemsList = document.getElementById("cart-items");
    const emptyCart = document.getElementById("empty-cart");
    const filledCart = document.getElementById("filled-cart");
    const cartTotal = document.getElementById("cart-total");
    const cartAgentTotal = document.getElementById("cart-agent-total");

    if (!cartItemsList || !emptyCart || !filledCart || !cartTotal || !cartAgentTotal) {
        return;
    }

    const cart = getCart();
    const hasItems = cart.length > 0;
    emptyCart.hidden = hasItems;
    filledCart.hidden = !hasItems;
    cartItemsList.replaceChildren();

    let totalMonthly = 0;
    let totalAgents = 0;

    cart.forEach(function (item) {
        const subtotal = item.price * item.quantity;
        totalMonthly += subtotal;
        totalAgents += item.quantity;

        const listItem = document.createElement("li");
        const itemHeader = document.createElement("div");
        const titleGroup = document.createElement("div");
        const title = document.createElement("h2");
        const type = document.createElement("span");
        const details = document.createElement("div");
        const controls = document.createElement("div");
        const quantityLabel = document.createElement("span");
        const decreaseButton = document.createElement("button");
        const quantity = document.createElement("span");
        const increaseButton = document.createElement("button");
        const removeButton = document.createElement("button");

        listItem.className = "cart-item";
        itemHeader.className = "cart-item-header";
        titleGroup.className = "cart-item-title";
        title.textContent = item.name;
        type.className = `cart-item-type cart-item-type-${item.type}`;
        type.textContent = item.type === "custom" ? "Personalizado" : "Predefinido";
        titleGroup.append(title, type);
        itemHeader.appendChild(titleGroup);

        details.className = "cart-item-details";
        details.append(
            createCartMeta("Precio mensual unitario", `${formatCurrency(item.price)}/mes`),
            createCartMeta("Subtotal mensual", `${formatCurrency(subtotal)}/mes`)
        );

        if (item.modules.length > 0) {
            const modulesBlock = document.createElement("div");
            const modulesTitle = document.createElement("h3");
            const modulesList = document.createElement("ul");

            modulesBlock.className = "cart-item-modules";
            modulesTitle.textContent = "Módulos seleccionados";
            item.modules.forEach(function (moduleName) {
                const moduleItem = document.createElement("li");
                moduleItem.textContent = moduleName;
                modulesList.appendChild(moduleItem);
            });
            modulesBlock.append(modulesTitle, modulesList);
            listItem.append(itemHeader, details, modulesBlock);
        } else {
            listItem.append(itemHeader, details);
        }

        controls.className = "cart-item-controls";
        quantityLabel.className = "cart-quantity-label";
        quantityLabel.textContent = "Cantidad";
        decreaseButton.type = "button";
        decreaseButton.className = "quantity-button";
        decreaseButton.dataset.cartAction = "decrease";
        decreaseButton.dataset.itemId = item.id;
        decreaseButton.setAttribute("aria-label", `Disminuir cantidad de ${item.name}`);
        decreaseButton.textContent = "−";
        quantity.className = "cart-item-quantity";
        quantity.textContent = String(item.quantity);
        quantity.setAttribute("aria-label", `Cantidad: ${item.quantity}`);
        increaseButton.type = "button";
        increaseButton.className = "quantity-button";
        increaseButton.dataset.cartAction = "increase";
        increaseButton.dataset.itemId = item.id;
        increaseButton.setAttribute("aria-label", `Aumentar cantidad de ${item.name}`);
        increaseButton.textContent = "+";
        removeButton.type = "button";
        removeButton.className = "remove-cart-item";
        removeButton.dataset.cartAction = "remove";
        removeButton.dataset.itemId = item.id;
        removeButton.textContent = "Eliminar agente";
        controls.append(quantityLabel, decreaseButton, quantity, increaseButton, removeButton);
        listItem.appendChild(controls);
        cartItemsList.appendChild(listItem);
    });

    cartTotal.textContent = `${formatCurrency(totalMonthly)}/mes`;
    cartAgentTotal.textContent = String(totalAgents);
    updateCartCount();
}

const cartItemsList = document.getElementById("cart-items");

if (cartItemsList) {
    cartItemsList.addEventListener("click", function (event) {
        const actionButton = event.target.closest("button[data-cart-action]");

        if (!actionButton) {
            return;
        }

        if (actionButton.dataset.cartAction === "increase") {
            updateCartQuantity(actionButton.dataset.itemId, 1);
        } else if (actionButton.dataset.cartAction === "decrease") {
            updateCartQuantity(actionButton.dataset.itemId, -1);
        } else if (actionButton.dataset.cartAction === "remove") {
            removeCartItem(actionButton.dataset.itemId);
        }
    });
}

const simulatedCheckoutButton = document.getElementById("simulated-checkout");
const checkoutMessage = document.getElementById("checkout-message");

if (simulatedCheckoutButton && checkoutMessage) {
    simulatedCheckoutButton.addEventListener("click", function () {
        checkoutMessage.textContent = "Checkout disponible en el siguiente bloque (simulado).";
    });
}

updateCartCount();
renderCart();

const adminMenuButtons = document.querySelectorAll(".admin-menu-button");
const adminSections = document.querySelectorAll(".admin-section");
const adminActionMessage = document.getElementById("admin-action-message");
const adminActionButtons = document.querySelectorAll("[data-admin-message]");

if (adminMenuButtons.length > 0 && adminSections.length > 0) {
    adminMenuButtons.forEach(function (adminMenuButton) {
        adminMenuButton.addEventListener("click", function (event) {
            const targetSectionId = event.currentTarget.dataset.adminSection;

            adminMenuButtons.forEach(function (button) {
                const isActive = button === event.currentTarget;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });

            adminSections.forEach(function (adminSection) {
                const shouldShow = adminSection.id === targetSectionId;
                adminSection.hidden = !shouldShow;
                adminSection.classList.toggle("is-active", shouldShow);
            });
        });
    });
}

if (adminActionMessage && adminActionButtons.length > 0) {
    adminActionButtons.forEach(function (adminActionButton) {
        adminActionButton.addEventListener("click", function (event) {
            adminActionMessage.textContent = event.currentTarget.dataset.adminMessage || "Acción simulada correctamente.";
        });
    });
}

const planCatalog = document.getElementById("plan-catalog");
const filterButtons = document.querySelectorAll(".filter-button");
const catalogFilterStatus = document.getElementById("catalog-filter-status");

const filterLabels = {
    all: "Mostrando todos los planes",
    basic: "Mostrando el plan de atención básica",
    "follow-up": "Mostrando el plan de seguimiento",
    advanced: "Mostrando el plan de automatización avanzada",
    custom: "Mostrando la opción personalizable"
};

function filterPlans(event) {
    if (!planCatalog) {
        return;
    }

    const selectedFilter = event.currentTarget.dataset.filter;
    const planCards = planCatalog.querySelectorAll(".plan-card[data-category]");

    filterButtons.forEach(function (filterButton) {
        const isSelected = filterButton === event.currentTarget;
        filterButton.classList.toggle("is-active", isSelected);
        filterButton.setAttribute("aria-pressed", String(isSelected));
    });

    planCards.forEach(function (planCard) {
        const shouldShow = selectedFilter === "all" || planCard.dataset.category === selectedFilter;
        planCard.classList.toggle("is-hidden", !shouldShow);
    });

    if (catalogFilterStatus) {
        catalogFilterStatus.textContent = filterLabels[selectedFilter] || filterLabels.all;
    }
}

if (planCatalog) {
    filterButtons.forEach(function (filterButton) {
        filterButton.addEventListener("click", filterPlans);
    });
}

const customAgentBuilder = document.getElementById("custom-agent-builder");
const moduleCheckboxes = document.querySelectorAll(".module-checkbox");
const extrasTotal = document.getElementById("extras-total");
const monthlyTotal = document.getElementById("monthly-total");
const moduleCount = document.getElementById("module-count");
const plusCountElement = document.getElementById("plus-count");
const advancedCountElement = document.getElementById("advanced-count");
const selectedModulesList = document.getElementById("selected-modules-list");
const recommendationMessage = document.getElementById("recommendation-message");
const addCustomAgentToCartButton = document.getElementById("add-custom-agent-to-cart");
const customAgentQuantity = document.getElementById("custom-agent-quantity");
const customCartLink = document.getElementById("custom-cart-link");
const customQuoteMessage = document.getElementById("custom-quote-message");

function formatMonthlyPrice(price) {
    return `$${price.toLocaleString("es-MX")}`;
}

function setRecommendationWithLink(textBefore, linkText, href, textAfter) {
    const recommendationLink = document.createElement("a");
    recommendationLink.className = "recommendation-link";
    recommendationLink.href = href;
    recommendationLink.textContent = linkText;

    recommendationMessage.replaceChildren(
        document.createTextNode(textBefore),
        recommendationLink,
        document.createTextNode(textAfter || "")
    );
}

function updateRecommendation(selectedTotal, plusCount, advancedCount) {
    if (!recommendationMessage) {
        return;
    }

    if (selectedTotal === 0) {
        recommendationMessage.textContent = "Selecciona las funciones que necesita tu negocio para recibir una sugerencia personalizada.";
        recommendationMessage.dataset.level = "neutral";
        return;
    }

    if (selectedTotal < 6) {
        recommendationMessage.textContent = "Agrega al menos 6 funciones para recibir una recomendación más precisa.";
        recommendationMessage.dataset.level = "neutral";
        return;
    }

    if (advancedCount === 0 && plusCount > 0) {
        setRecommendationWithLink(
            "La mayoría de tus funciones seleccionadas son tipo Agente Plus. También podrías comparar con el plan ",
            "Agente Plus",
            "plan-plus.html#buy-plan",
            "."
        );
        recommendationMessage.dataset.level = "plus";
        return;
    }

    if (advancedCount > plusCount) {
        setRecommendationWithLink(
            "La mayoría de tus funciones seleccionadas son avanzadas. Probablemente te conviene revisar ",
            "Agente Avanzado",
            "plan-advanced.html#buy-plan",
            "."
        );
        recommendationMessage.dataset.level = "advanced";
        return;
    }

    if (plusCount === advancedCount) {
        recommendationMessage.textContent = "Tu configuración combina funciones Plus y Avanzadas en partes iguales. En este caso, un agente personalizado puede adaptarse mejor a lo que necesitas.";
        recommendationMessage.dataset.level = "neutral";
        return;
    }

    if (plusCount > advancedCount && advancedCount > 0) {
        recommendationMessage.textContent = "Tu configuración mezcla funciones Plus con algunas funciones avanzadas. Puede convenirte mantener un agente personalizado para no perder esas funciones.";
        recommendationMessage.dataset.level = "neutral";
        return;
    }

    if (advancedCount > 0) {
        recommendationMessage.textContent = "Tu selección combina diferentes niveles de automatización. Revisa si prefieres mantener un agente personalizado.";
        recommendationMessage.dataset.level = "neutral";
    }
}

function updateCustomAgentSummary() {
    if (!customAgentBuilder || !extrasTotal || !monthlyTotal || !moduleCount || !plusCountElement || !advancedCountElement || !selectedModulesList) {
        return;
    }

    const basePrice = Number(customAgentBuilder.dataset.basePrice) || 499;
    const selectedModules = Array.from(moduleCheckboxes).filter(function (moduleCheckbox) {
        return moduleCheckbox.checked;
    });
    const extrasPrice = selectedModules.reduce(function (total, moduleCheckbox) {
        return total + (Number(moduleCheckbox.dataset.price) || 0);
    }, 0);
    const plusCount = selectedModules.filter(function (moduleCheckbox) {
        return moduleCheckbox.dataset.tier === "plus";
    }).length;
    const advancedCount = selectedModules.filter(function (moduleCheckbox) {
        return moduleCheckbox.dataset.tier === "advanced";
    }).length;
    const total = basePrice + extrasPrice;

    extrasTotal.textContent = formatMonthlyPrice(extrasPrice);
    monthlyTotal.textContent = formatMonthlyPrice(total);
    moduleCount.textContent = String(selectedModules.length);
    plusCountElement.textContent = String(plusCount);
    advancedCountElement.textContent = String(advancedCount);
    selectedModulesList.replaceChildren();

    if (selectedModules.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-selection";
        emptyItem.textContent = "Aún no has agregado funciones extra.";
        selectedModulesList.appendChild(emptyItem);
    } else {
        selectedModules.forEach(function (moduleCheckbox) {
            const selectedItem = document.createElement("li");
            selectedItem.textContent = `${moduleCheckbox.dataset.name} (${formatMonthlyPrice(Number(moduleCheckbox.dataset.price))}/mes)`;
            selectedModulesList.appendChild(selectedItem);
        });
    }

    updateRecommendation(selectedModules.length, plusCount, advancedCount);
}

if (customAgentBuilder) {
    moduleCheckboxes.forEach(function (moduleCheckbox) {
        moduleCheckbox.addEventListener("change", function (event) {
            const moduleOption = event.currentTarget.closest(".module-option");

            if (moduleOption) {
                moduleOption.classList.toggle("is-selected", event.currentTarget.checked);
            }

            if (customQuoteMessage) {
                customQuoteMessage.textContent = "";
            }

            updateCustomAgentSummary();
        });
    });

    if (addCustomAgentToCartButton && customQuoteMessage) {
        addCustomAgentToCartButton.addEventListener("click", function () {
            const selectedModules = Array.from(moduleCheckboxes).filter(function (moduleCheckbox) {
                return moduleCheckbox.checked;
            });
            const extrasPrice = selectedModules.reduce(function (total, moduleCheckbox) {
                return total + (Number(moduleCheckbox.dataset.price) || 0);
            }, 0);
            const price = (Number(customAgentBuilder.dataset.basePrice) || 499) + extrasPrice;
            const quantity = normalizeQuantity(customAgentQuantity ? customAgentQuantity.value : 1);
            const wasAdded = addToCart({
                name: "Agente personalizado",
                type: "custom",
                price: price,
                quantity: quantity,
                modules: selectedModules.map(function (moduleCheckbox) {
                    return moduleCheckbox.dataset.name;
                })
            });

            if (customAgentQuantity) {
                customAgentQuantity.value = String(quantity);
            }

            customQuoteMessage.textContent = wasAdded
                ? "Agente personalizado agregado al carrito (simulado)."
                : "No fue posible guardar el agente personalizado en el carrito.";

            if (customCartLink) {
                customCartLink.hidden = !wasAdded;
            }
        });
    }

    updateCustomAgentSummary();
}

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
