const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");
const commentForm = document.getElementById("comment-form");
const commentMessage = document.getElementById("comment-message");
const commentList = document.getElementById("comment-list");
const CART_STORAGE_KEY = "ecoreCart";
const PROMOTION_STORAGE_KEY = "ecorePromotions";
const DELETED_PROMOTION_STORAGE_KEY = "ecoreDeletedPromotions";
const APPLIED_PROMOTION_KEY = "ecoreAppliedPromotion";
const COOKIE_CONSENT_STORAGE_KEY = "ecoreCookieConsent";
const AUCTION_OFFERS_STORAGE_KEY = "ecoreAuctionOffers";
const AUCTION_DEADLINES_STORAGE_KEY = "ecoreAuctionDeadlines";

const DEFAULT_AUCTION_OFFERS = {
    "gaming-pc": [
        { user: "Mariana G.", amount: 12500, createdAt: "2026-07-16T10:00:00.000Z" }
    ],
    monitor: [
        { user: "Luis R.", amount: 3200, createdAt: "2026-07-16T10:05:00.000Z" }
    ],
    keyboard: [
        { user: "Andrea M.", amount: 850, createdAt: "2026-07-16T10:10:00.000Z" }
    ]
};

const DEFAULT_PROMOTIONS = [
    {
        code: "AVANZADO10",
        name: "10% de descuento en Agente Avanzado",
        scope: "product",
        target: "Agente Avanzado",
        percent: 10,
        active: true,
        description: "Aplica 10% al Agente Avanzado dentro del carrito."
    },
    {
        code: "CONFIGGRATIS",
        name: "Configuración inicial sin costo",
        scope: "benefit",
        target: "Nuevos negocios",
        percent: 0,
        active: true,
        description: "Beneficio visual para nuevos negocios; no modifica el total mensual."
    }
];

function formatCurrency(amount) {
    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    const hasDecimals = Math.abs(safeAmount % 1) > 0;
    return `$${safeAmount.toLocaleString("es-MX", {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2
    })} MXN`;
}

function normalizeQuantity(quantity) {
    const parsedQuantity = Math.floor(Number(quantity));
    return Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
}

function normalizePromotion(promotion) {
    if (!promotion || !promotion.code || !Number.isFinite(Number(promotion.percent))) {
        return null;
    }

    const scope = ["product", "cart", "benefit"].includes(promotion.scope) ? promotion.scope : "product";

    return {
        code: String(promotion.code).trim().toUpperCase(),
        name: String(promotion.name || "Promoción simulada"),
        scope: scope,
        target: scope === "cart" ? "Carrito completo" : String(promotion.target || ""),
        percent: Math.min(90, Math.max(0, Number(promotion.percent))),
        active: promotion.active !== false,
        description: String(promotion.description || "")
    };
}

function getDeletedPromotionCodes() {
    try {
        const storedCodes = JSON.parse(localStorage.getItem(DELETED_PROMOTION_STORAGE_KEY) || "[]");
        return Array.isArray(storedCodes) ? storedCodes.map(function (code) {
            return String(code).trim().toUpperCase();
        }) : [];
    } catch (error) {
        return [];
    }
}

function getStoredPromotions() {
    try {
        const storedPromotions = localStorage.getItem(PROMOTION_STORAGE_KEY);
        const parsedPromotions = storedPromotions ? JSON.parse(storedPromotions) : [];

        if (!Array.isArray(parsedPromotions)) {
            return [];
        }

        return parsedPromotions.map(normalizePromotion).filter(Boolean);
    } catch (error) {
        return [];
    }
}

function getPromotions() {
    const deletedPromotionCodes = getDeletedPromotionCodes();
    const mergedPromotions = DEFAULT_PROMOTIONS.concat(getStoredPromotions()).filter(function (promotion) {
        return !deletedPromotionCodes.includes(String(promotion.code || "").trim().toUpperCase());
    });
    const uniquePromotions = [];

    mergedPromotions.forEach(function (promotion) {
        const normalizedPromotion = normalizePromotion(promotion);

        if (!normalizedPromotion) {
            return;
        }

        const existingIndex = uniquePromotions.findIndex(function (savedPromotion) {
            return savedPromotion.code === normalizedPromotion.code;
        });

        if (existingIndex >= 0) {
            uniquePromotions[existingIndex] = normalizedPromotion;
        } else {
            uniquePromotions.push(normalizedPromotion);
        }
    });

    return uniquePromotions;
}

function savePromotion(promotion) {
    const normalizedPromotion = normalizePromotion(promotion);

    if (!normalizedPromotion) {
        return false;
    }

    const storedPromotions = getStoredPromotions().filter(function (savedPromotion) {
        return savedPromotion.code !== normalizedPromotion.code;
    });

    storedPromotions.push(normalizedPromotion);
    localStorage.setItem(PROMOTION_STORAGE_KEY, JSON.stringify(storedPromotions));
    localStorage.setItem(DELETED_PROMOTION_STORAGE_KEY, JSON.stringify(getDeletedPromotionCodes().filter(function (deletedCode) {
        return deletedCode !== normalizedPromotion.code;
    })));
    return true;
}

function deletePromotion(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode) {
        return false;
    }

    const remainingPromotions = getStoredPromotions().filter(function (promotion) {
        return promotion.code !== normalizedCode;
    });
    const deletedPromotionCodes = getDeletedPromotionCodes();

    if (!deletedPromotionCodes.includes(normalizedCode)) {
        deletedPromotionCodes.push(normalizedCode);
    }

    localStorage.setItem(PROMOTION_STORAGE_KEY, JSON.stringify(remainingPromotions));
    localStorage.setItem(DELETED_PROMOTION_STORAGE_KEY, JSON.stringify(deletedPromotionCodes));

    if (getAppliedPromotionCode() === normalizedCode) {
        localStorage.removeItem(APPLIED_PROMOTION_KEY);
    }

    return true;
}

function getAppliedPromotionCode() {
    return String(localStorage.getItem(APPLIED_PROMOTION_KEY) || "").trim().toUpperCase();
}

function findPromotionByCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    return getPromotions().find(function (promotion) {
        return promotion.active && promotion.code === normalizedCode;
    }) || null;
}

function calculateCartDiscount(cart, promotion) {
    if (!promotion || promotion.scope === "benefit") {
        return 0;
    }

    const discountBase = cart.reduce(function (total, item) {
        const subtotal = item.price * item.quantity;

        if (promotion.scope === "cart") {
            return total + subtotal;
        }

        return item.name === promotion.target ? total + subtotal : total;
    }, 0);

    return discountBase * (promotion.percent / 100);
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

if (commentForm && commentMessage && commentList) {
    commentForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const nameInput = document.getElementById("comment-name");
        const textInput = document.getElementById("comment-text");
        const name = nameInput ? nameInput.value.trim() : "";
        const text = textInput ? textInput.value.trim() : "";

        if (!name || !text) {
            commentMessage.textContent = "Completa tu nombre y comentario.";
            return;
        }

        const commentCard = document.createElement("article");
        const commentText = document.createElement("p");
        const commentAuthor = document.createElement("strong");

        commentCard.className = "comment-card";
        commentText.textContent = `“${text}”`;
        commentAuthor.textContent = name;
        commentCard.append(commentText, commentAuthor);
        commentList.prepend(commentCard);
        commentMessage.textContent = "Comentario publicado correctamente (simulado).";
        commentForm.reset();
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
    const cartSubtotal = document.getElementById("cart-subtotal");
    const cartSubtotalRow = document.getElementById("cart-subtotal-row");
    const cartDiscount = document.getElementById("cart-discount");
    const cartDiscountRow = document.getElementById("cart-discount-row");

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

    const appliedPromotion = findPromotionByCode(getAppliedPromotionCode());
    const discountAmount = calculateCartDiscount(cart, appliedPromotion);
    const finalTotal = Math.max(0, totalMonthly - discountAmount);

    if (cartSubtotal && cartSubtotalRow && cartDiscount && cartDiscountRow) {
        const hasDiscount = discountAmount > 0;
        cartSubtotalRow.hidden = !hasDiscount;
        cartDiscountRow.hidden = !hasDiscount;
        cartSubtotal.textContent = `${formatCurrency(totalMonthly)}/mes`;
        cartDiscount.textContent = `-${formatCurrency(discountAmount)}/mes`;
    }

    cartTotal.textContent = `${formatCurrency(finalTotal)}/mes`;
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
const applyCartPromoButton = document.getElementById("apply-cart-promo");
const cartPromoCodeInput = document.getElementById("cart-promo-code");
const cartPromoMessage = document.getElementById("cart-promo-message");

if (simulatedCheckoutButton && checkoutMessage) {
    simulatedCheckoutButton.addEventListener("click", function () {
        checkoutMessage.textContent = "Checkout disponible en el siguiente bloque (simulado).";
    });
}

if (applyCartPromoButton && cartPromoCodeInput && cartPromoMessage) {
    cartPromoCodeInput.value = getAppliedPromotionCode();

    applyCartPromoButton.addEventListener("click", function () {
        const promoCode = cartPromoCodeInput.value.trim().toUpperCase();
        const promotion = findPromotionByCode(promoCode);

        if (!promotion) {
            localStorage.removeItem(APPLIED_PROMOTION_KEY);
            cartPromoMessage.textContent = "Código no válido o inactivo (simulado).";
            renderCart();
            return;
        }

        localStorage.setItem(APPLIED_PROMOTION_KEY, promotion.code);
        cartPromoCodeInput.value = promotion.code;
        cartPromoMessage.textContent = "Descuento aplicado (simulado).";
        renderCart();
    });
}

let policyModal = document.getElementById("policy-modal");
const policyOpenButtons = document.querySelectorAll("[data-policy-open]");
const policyCloseButtons = document.querySelectorAll("[data-policy-close]");

function createPolicyModal() {
    const modal = document.createElement("div");
    const backdrop = document.createElement("div");
    const content = document.createElement("section");
    const closeButton = document.createElement("button");
    const eyebrow = document.createElement("span");
    const title = document.createElement("h2");
    const intro = document.createElement("p");
    const list = document.createElement("ul");
    const acceptButton = document.createElement("button");
    const policies = [
        "Los agentes mostrados son servicios simulados para fines académicos.",
        "Los precios del carrito son mensuales y solo se usan como referencia visual.",
        "El botón “Ir a pagar” no procesa pagos reales ni solicita datos bancarios.",
        "La información del carrito se guarda localmente en el navegador mediante localStorage.",
        "Los agentes personalizados pueden variar según las funciones seleccionadas por el usuario.",
        "La atención, contratación y configuración real quedarían pendientes para una versión con backend."
    ];

    modal.className = "policy-modal";
    modal.id = "policy-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "policy-modal-title");
    backdrop.className = "policy-modal-backdrop";
    content.className = "policy-modal-content";
    closeButton.type = "button";
    closeButton.className = "policy-modal-close";
    closeButton.setAttribute("aria-label", "Cerrar políticas y condiciones");
    closeButton.textContent = "×";
    eyebrow.className = "section-eyebrow";
    eyebrow.textContent = "Simulación académica";
    title.id = "policy-modal-title";
    title.textContent = "Políticas y condiciones";
    intro.textContent = "Estas políticas son un ejemplo visual para el proyecto ECore Agents. No representan un contrato real ni generan cobros reales.";
    acceptButton.type = "button";
    acceptButton.className = "button policy-modal-accept";
    acceptButton.textContent = "Entendido";

    policies.forEach(function (policyText) {
        const item = document.createElement("li");
        item.textContent = policyText;
        list.appendChild(item);
    });

    backdrop.addEventListener("click", closePolicyModal);
    closeButton.addEventListener("click", closePolicyModal);
    acceptButton.addEventListener("click", closePolicyModal);

    content.append(closeButton, eyebrow, title, intro, list, acceptButton);
    modal.append(backdrop, content);
    document.body.appendChild(modal);
    return modal;
}

function openPolicyModal() {
    if (!policyModal) {
        policyModal = createPolicyModal();
    }

    if (!policyModal) {
        return;
    }

    policyModal.hidden = false;
    document.body.classList.add("modal-open");

    const closeButton = policyModal.querySelector(".policy-modal-close");
    if (closeButton) {
        closeButton.focus();
    }
}

function closePolicyModal() {
    if (!policyModal) {
        return;
    }

    policyModal.hidden = true;
    document.body.classList.remove("modal-open");
}

policyOpenButtons.forEach(function (policyOpenButton) {
    policyOpenButton.addEventListener("click", openPolicyModal);
});

policyCloseButtons.forEach(function (policyCloseButton) {
    policyCloseButton.addEventListener("click", closePolicyModal);
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && policyModal && !policyModal.hidden) {
        closePolicyModal();
    }
});

function saveCookieConsent(choice, categories) {
    const consentData = {
        choice: choice,
        categories: categories,
        savedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consentData));
        return true;
    } catch (error) {
        return false;
    }
}

function hasCookieConsent() {
    try {
        const savedConsent = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

        if (!savedConsent) {
            return false;
        }

        const parsedConsent = JSON.parse(savedConsent);
        return Boolean(parsedConsent && parsedConsent.choice && parsedConsent.categories);
    } catch (error) {
        return false;
    }
}

function initCookieConsent() {
    if (hasCookieConsent() || !document.body) {
        return;
    }

    const cookieCategories = [
        {
            id: "necessary",
            name: "Cookies necesarias",
            description: "Permiten la navegación básica y guardan tu decisión de privacidad.",
            required: true
        },
        {
            id: "cart",
            name: "Carrito y agentes",
            description: "Conservan temporalmente los agentes y cantidades seleccionadas."
        },
        {
            id: "preferences",
            name: "Preferencias del sitio",
            description: "Recuerdan configuraciones visuales y opciones elegidas."
        },
        {
            id: "analytics",
            name: "Analítica simulada",
            description: "Representan mediciones académicas sobre el uso de las páginas."
        },
        {
            id: "marketing",
            name: "Promociones y marketing",
            description: "Permiten mostrar campañas y descuentos relacionados con los agentes."
        },
        {
            id: "community",
            name: "Comunidad y comentarios",
            description: "Representan preferencias relacionadas con reseñas y comentarios simulados."
        }
    ];
    const banner = document.createElement("section");
    const header = document.createElement("div");
    const textGroup = document.createElement("div");
    const eyebrow = document.createElement("span");
    const title = document.createElement("h2");
    const description = document.createElement("p");
    const preferences = document.createElement("div");
    const preferencesIntro = document.createElement("p");
    const optionsGrid = document.createElement("div");
    const actions = document.createElement("div");
    const rejectButton = document.createElement("button");
    const customizeButton = document.createElement("button");
    const acceptButton = document.createElement("button");
    const savePreferencesButton = document.createElement("button");

    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "true");
    banner.setAttribute("aria-labelledby", "cookie-banner-title");
    header.className = "cookie-banner-header";
    textGroup.className = "cookie-banner-copy";
    eyebrow.className = "cookie-banner-eyebrow";
    eyebrow.textContent = "Privacidad simulada";
    title.id = "cookie-banner-title";
    title.textContent = "Uso de cookies";
    description.textContent = "Utilizamos cookies simuladas para recordar el carrito, tus preferencias y mejorar la experiencia académica del sitio. Puedes aceptar, rechazar o elegir qué categorías permitir.";
    preferences.className = "cookie-preferences";
    preferences.hidden = true;
    preferencesIntro.textContent = "Selecciona las categorías que deseas aceptar. Las cookies necesarias permanecen activas para guardar tu elección.";
    optionsGrid.className = "cookie-options-grid";
    actions.className = "cookie-banner-actions";

    rejectButton.type = "button";
    rejectButton.className = "cookie-button cookie-button-secondary";
    rejectButton.textContent = "Rechazar";
    customizeButton.type = "button";
    customizeButton.className = "cookie-button cookie-button-secondary";
    customizeButton.textContent = "Personalizar";
    acceptButton.type = "button";
    acceptButton.className = "cookie-button cookie-button-primary";
    acceptButton.textContent = "Aceptar";
    savePreferencesButton.type = "button";
    savePreferencesButton.className = "cookie-button cookie-button-primary cookie-save-preferences";
    savePreferencesButton.textContent = "Guardar preferencias";
    savePreferencesButton.hidden = true;

    cookieCategories.forEach(function (category) {
        const option = document.createElement("label");
        const optionText = document.createElement("span");
        const optionName = document.createElement("strong");
        const optionDescription = document.createElement("small");
        const checkbox = document.createElement("input");

        option.className = "cookie-option";
        checkbox.type = "checkbox";
        checkbox.dataset.cookieCategory = category.id;
        checkbox.checked = category.required;
        checkbox.disabled = category.required;
        optionText.className = "cookie-option-copy";
        optionName.textContent = category.name;
        optionDescription.textContent = category.description;
        optionText.append(optionName, optionDescription);
        option.append(checkbox, optionText);
        optionsGrid.appendChild(option);
    });

    function getCategorySelection(mode) {
        const categorySelection = {};

        cookieCategories.forEach(function (category) {
            const checkbox = optionsGrid.querySelector(`[data-cookie-category="${category.id}"]`);
            categorySelection[category.id] = category.required
                || mode === "all"
                || (mode === "custom" && Boolean(checkbox && checkbox.checked));
        });

        return categorySelection;
    }

    function closeCookieBanner(choice, categories) {
        saveCookieConsent(choice, categories);
        banner.classList.remove("is-visible");
        window.setTimeout(function () {
            banner.remove();
        }, 220);
    }

    rejectButton.addEventListener("click", function () {
        closeCookieBanner("rejected", getCategorySelection("necessary"));
    });

    acceptButton.addEventListener("click", function () {
        closeCookieBanner("accepted", getCategorySelection("all"));
    });

    customizeButton.addEventListener("click", function () {
        const willOpen = preferences.hidden;
        preferences.hidden = !willOpen;
        savePreferencesButton.hidden = !willOpen;
        acceptButton.hidden = willOpen;
        customizeButton.textContent = willOpen ? "Ocultar opciones" : "Personalizar";

        if (willOpen) {
            const firstOptionalCheckbox = optionsGrid.querySelector("input:not(:disabled)");
            if (firstOptionalCheckbox) {
                firstOptionalCheckbox.focus();
            }
        }
    });

    savePreferencesButton.addEventListener("click", function () {
        closeCookieBanner("custom", getCategorySelection("custom"));
    });

    textGroup.append(eyebrow, title, description);
    header.appendChild(textGroup);
    preferences.append(preferencesIntro, optionsGrid);
    actions.append(rejectButton, customizeButton, acceptButton, savePreferencesButton);
    banner.append(header, preferences, actions);
    document.body.appendChild(banner);

    window.requestAnimationFrame(function () {
        banner.classList.add("is-visible");
        acceptButton.focus();
    });
}

initCookieConsent();

function addAuctionNavigationLink() {
    document.querySelectorAll('nav[aria-label="Navegación principal"]').forEach(function (navigation) {
        if (navigation.querySelector('a[href="auction.html"]')) {
            return;
        }

        const auctionLink = document.createElement("a");
        const servicesLink = navigation.querySelector('a[href="services.html"]');
        const catalogLink = navigation.querySelector('a[href="catalogo.html"]');
        const referenceLink = servicesLink || catalogLink;

        auctionLink.href = "auction.html";
        auctionLink.textContent = "Subasta";

        if (referenceLink) {
            referenceLink.insertAdjacentElement("afterend", auctionLink);
        } else {
            navigation.appendChild(auctionLink);
        }
    });
}

function getAuctionOffers() {
    try {
        const storedValue = localStorage.getItem(AUCTION_OFFERS_STORAGE_KEY);

        if (!storedValue) {
            return JSON.parse(JSON.stringify(DEFAULT_AUCTION_OFFERS));
        }

        const storedOffers = JSON.parse(storedValue);
        return storedOffers && typeof storedOffers === "object" ? storedOffers : {};
    } catch (error) {
        return JSON.parse(JSON.stringify(DEFAULT_AUCTION_OFFERS));
    }
}

function saveAuctionOffers(offers) {
    try {
        localStorage.setItem(AUCTION_OFFERS_STORAGE_KEY, JSON.stringify(offers));
        return true;
    } catch (error) {
        return false;
    }
}

function getAuctionDeadlines() {
    try {
        const storedDeadlines = JSON.parse(localStorage.getItem(AUCTION_DEADLINES_STORAGE_KEY) || "{}");
        return storedDeadlines && typeof storedDeadlines === "object" ? storedDeadlines : {};
    } catch (error) {
        return {};
    }
}

function saveAuctionDeadlines(deadlines) {
    try {
        localStorage.setItem(AUCTION_DEADLINES_STORAGE_KEY, JSON.stringify(deadlines));
    } catch (error) {
        return;
    }
}

function getAuctionUserName() {
    try {
        const sessionUser = JSON.parse(localStorage.getItem("ecoreSession") || "null");
        return sessionUser && sessionUser.name ? String(sessionUser.name) : "Usuario invitado";
    } catch (error) {
        return "Usuario invitado";
    }
}

function formatAuctionTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    return [hours, minutes, remainingSeconds].map(function (value) {
        return String(value).padStart(2, "0");
    }).join(":");
}

function renderAuctionCard(auctionCard) {
    const auctionId = auctionCard.dataset.auctionId;
    const startingPrice = Number(auctionCard.dataset.startingPrice);
    const allOffers = getAuctionOffers();
    const productOffers = Array.isArray(allOffers[auctionId]) ? allOffers[auctionId] : [];
    const currentPrice = productOffers.reduce(function (highestPrice, offer) {
        return Math.max(highestPrice, Number(offer.amount) || 0);
    }, startingPrice);
    const priceElement = auctionCard.querySelector(".auction-current-price");
    const bidInput = auctionCard.querySelector(".auction-bid-input");
    const offerList = auctionCard.querySelector(".auction-offer-list");

    if (priceElement) {
        priceElement.textContent = formatCurrency(currentPrice);
    }

    if (bidInput) {
        const step = Math.max(1, Number(bidInput.step) || 1);
        bidInput.min = String(currentPrice + step);
    }

    if (!offerList) {
        return;
    }

    offerList.replaceChildren();

    if (productOffers.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "auction-offer-empty";
        emptyItem.textContent = "Todavía no hay ofertas registradas.";
        offerList.appendChild(emptyItem);
        return;
    }

    productOffers.slice().reverse().slice(0, 5).forEach(function (offer) {
        const offerItem = document.createElement("li");
        const userName = document.createElement("span");
        const amount = document.createElement("strong");

        userName.textContent = String(offer.user || "Usuario invitado");
        amount.textContent = formatCurrency(Number(offer.amount));
        offerItem.append(userName, amount);
        offerList.appendChild(offerItem);
    });
}

function initAuctionPage() {
    const auctionCards = document.querySelectorAll(".auction-card[data-auction-id]");

    if (auctionCards.length === 0) {
        return;
    }

    const deadlines = getAuctionDeadlines();
    const now = Date.now();

    auctionCards.forEach(function (auctionCard) {
        const auctionId = auctionCard.dataset.auctionId;
        const duration = Math.max(60, Number(auctionCard.dataset.duration) || 3600);

        if (!Number.isFinite(Number(deadlines[auctionId])) || Number(deadlines[auctionId]) <= now) {
            deadlines[auctionId] = now + duration * 1000;
        }

        renderAuctionCard(auctionCard);

        const bidForm = auctionCard.querySelector(".auction-bid-form");
        const bidInput = auctionCard.querySelector(".auction-bid-input");
        const bidMessage = auctionCard.querySelector(".auction-bid-message");

        if (bidForm && bidInput && bidMessage) {
            bidForm.addEventListener("submit", function (event) {
                event.preventDefault();
                const bidAmount = Number(bidInput.value);
                const minimumBid = Number(bidInput.min);

                if (!Number.isFinite(bidAmount) || bidAmount < minimumBid) {
                    bidMessage.textContent = `La oferta debe ser de al menos ${formatCurrency(minimumBid)}.`;
                    bidMessage.classList.add("is-error");
                    return;
                }

                const allOffers = getAuctionOffers();
                const productOffers = Array.isArray(allOffers[auctionId]) ? allOffers[auctionId] : [];
                productOffers.push({
                    user: getAuctionUserName(),
                    amount: bidAmount,
                    createdAt: new Date().toISOString()
                });
                allOffers[auctionId] = productOffers;

                if (!saveAuctionOffers(allOffers)) {
                    bidMessage.textContent = "No fue posible registrar la oferta simulada.";
                    bidMessage.classList.add("is-error");
                    return;
                }

                bidInput.value = "";
                bidMessage.textContent = "Oferta registrada (simulado).";
                bidMessage.classList.remove("is-error");
                renderAuctionCard(auctionCard);
            });
        }
    });

    saveAuctionDeadlines(deadlines);

    function updateAuctionTimers() {
        const currentTime = Date.now();

        auctionCards.forEach(function (auctionCard) {
            const auctionId = auctionCard.dataset.auctionId;
            const countdown = auctionCard.querySelector(".auction-countdown");
            const remainingSeconds = Math.max(0, Math.floor((Number(deadlines[auctionId]) - currentTime) / 1000));

            if (countdown) {
                countdown.textContent = remainingSeconds > 0 ? formatAuctionTime(remainingSeconds) : "Finalizada";
            }
        });
    }

    updateAuctionTimers();
    window.setInterval(updateAuctionTimers, 1000);
}

addAuctionNavigationLink();
initAuctionPage();

updateCartCount();
renderCart();

const adminMenuButtons = document.querySelectorAll(".admin-menu-button");
const adminSections = document.querySelectorAll(".admin-section");
const adminActionMessage = document.getElementById("admin-action-message");
const adminActionButtons = document.querySelectorAll("[data-admin-message]");
let activeProductCard = null;
let activeProductFormMode = "add";

if (adminActionMessage && adminActionButtons.length > 0) {
    adminActionButtons.forEach(function (adminActionButton) {
        adminActionButton.addEventListener("click", function (event) {
            adminActionMessage.textContent = event.currentTarget.dataset.adminMessage || "Acción simulada correctamente.";
        });
    });
}

function getStatusClass(status) {
    const normalizedStatus = String(status || "").toLowerCase();

    if (normalizedStatus.includes("revisión") || normalizedStatus.includes("seguimiento") || normalizedStatus.includes("interesado")) {
        return "review";
    }

    if (normalizedStatus.includes("pausado") || normalizedStatus.includes("pendiente") || normalizedStatus.includes("agotado")) {
        return "pending";
    }

    return "active";
}

function setAdminMessage(message) {
    if (adminActionMessage) {
        adminActionMessage.textContent = message;
    }
}

function getProductFormElements() {
    const productForm = document.getElementById("admin-product-form");

    if (!productForm) {
        return null;
    }

    return {
        form: productForm,
        title: document.getElementById("admin-product-form-title"),
        name: document.getElementById("admin-product-name"),
        category: document.getElementById("admin-product-category"),
        price: document.getElementById("admin-product-price"),
        stock: document.getElementById("admin-product-stock"),
        status: document.getElementById("admin-product-status"),
        image: document.getElementById("admin-product-image"),
        imagePreview: document.getElementById("admin-image-preview"),
        description: document.getElementById("admin-product-description")
    };
}

function showAdminSection(sectionId) {
    if (adminMenuButtons.length === 0 || adminSections.length === 0 || !sectionId) {
        return;
    }

    adminMenuButtons.forEach(function (button) {
        const isActive = button.dataset.adminSection === sectionId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    adminSections.forEach(function (adminSection) {
        const shouldShow = adminSection.id === sectionId;
        adminSection.hidden = !shouldShow;
        adminSection.classList.toggle("is-active", shouldShow);
    });
}

function openProductForm(mode, productData) {
    const elements = getProductFormElements();

    if (!elements || !elements.form || !elements.title || !elements.name || !elements.category || !elements.price || !elements.stock || !elements.status || !elements.image || !elements.description) {
        return;
    }

    activeProductFormMode = mode === "edit" ? "edit" : "add";
    elements.title.textContent = activeProductFormMode === "edit" ? "Editar producto simulado" : "Agregar producto simulado";
    elements.name.value = productData && productData.name ? productData.name : "";
    elements.category.value = productData && productData.category ? productData.category : "Plan básico";
    elements.price.value = productData && productData.price ? productData.price : "";
    elements.stock.value = productData && productData.stock ? productData.stock : "0";
    elements.status.value = productData && productData.status ? productData.status : "Disponible";
    elements.image.value = productData && productData.image ? productData.image : "";
    elements.description.value = productData && productData.description ? productData.description : "";
    if (elements.imagePreview) {
        elements.imagePreview.textContent = elements.image.value.trim() || "Vista previa simulada";
    }
    elements.form.hidden = false;
    elements.name.focus();
}

function closeProductForm() {
    const elements = getProductFormElements();

    if (!elements || !elements.form) {
        return;
    }

    elements.form.reset();
    elements.form.hidden = true;
    activeProductCard = null;
    activeProductFormMode = "add";
    if (elements.imagePreview) {
        elements.imagePreview.textContent = "Vista previa simulada";
    }
}

function getProductDataFromCard(productCard) {
    if (!productCard) {
        return null;
    }

    return {
        name: productCard.dataset.productName || "",
        category: productCard.dataset.productCategory || "",
        price: productCard.dataset.productPrice || "",
        stock: productCard.dataset.productStock || "0",
        status: productCard.dataset.productStatus || "Disponible",
        image: productCard.dataset.productImage || "",
        description: productCard.dataset.productDescription || ""
    };
}

function applyProductDataToCard(productCard, productData) {
    const title = productCard.querySelector("h3");
    const category = productCard.querySelector("p");
    const price = productCard.querySelector(".admin-product-price");
    const stock = productCard.querySelector(".admin-product-stock");
    const status = productCard.querySelector(".admin-status");
    const thumb = productCard.querySelector(".admin-product-thumb");

    productCard.dataset.productName = productData.name;
    productCard.dataset.productCategory = productData.category;
    productCard.dataset.productPrice = productData.price;
    productCard.dataset.productStock = productData.stock;
    productCard.dataset.productStatus = productData.status;
    productCard.dataset.productImage = productData.image;
    productCard.dataset.productDescription = productData.description;

    if (title) {
        title.textContent = productData.name;
    }

    if (category) {
        category.textContent = productData.category;
    }

    if (price) {
        price.textContent = productData.price;
    }

    if (stock) {
        stock.textContent = productData.stock;
    }

    if (status) {
        status.className = `admin-status ${getStatusClass(productData.status)}`;
        status.textContent = productData.status;
    }

    if (thumb) {
        thumb.textContent = productData.image || productData.name.slice(0, 2).toUpperCase();
    }
}

function createProductCard(productData) {
    const productCard = document.createElement("article");
    const productThumb = document.createElement("div");
    const productInfo = document.createElement("div");
    const productTitle = document.createElement("h3");
    const productCategory = document.createElement("p");
    const productPrice = document.createElement("span");
    const productStock = document.createElement("span");
    const productStatus = document.createElement("span");
    const actions = document.createElement("div");
    const detailButton = document.createElement("button");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    productCard.className = "admin-product-card";
    productThumb.className = "admin-product-thumb";
    productPrice.className = "admin-product-price";
    productStock.className = "admin-product-stock";
    productStatus.className = `admin-status ${getStatusClass(productData.status)}`;
    actions.className = "admin-card-actions";
    detailButton.type = "button";
    detailButton.className = "admin-action-button admin-detail-product";
    detailButton.textContent = "Ver detalle";
    editButton.type = "button";
    editButton.className = "admin-action-button admin-edit-product";
    editButton.textContent = "Editar";
    deleteButton.type = "button";
    deleteButton.className = "admin-action-button danger admin-delete-product";
    deleteButton.textContent = "Eliminar";

    productInfo.append(productTitle, productCategory);
    actions.append(detailButton, editButton, deleteButton);
    productCard.append(productThumb, productInfo, productPrice, productStock, productStatus, actions);
    applyProductDataToCard(productCard, productData);
    return productCard;
}

function handleProductFormSubmit(event) {
    event.preventDefault();

    const elements = getProductFormElements();
    const productList = document.getElementById("admin-product-list");

    if (!elements || !productList || !elements.name || !elements.category || !elements.price || !elements.stock || !elements.status || !elements.image || !elements.description) {
        return;
    }

    const productData = {
        name: elements.name.value.trim(),
        category: elements.category.value,
        price: elements.price.value.trim(),
        stock: String(Math.max(0, Math.floor(Number(elements.stock.value) || 0))),
        status: elements.status.value,
        image: elements.image.value.trim(),
        description: elements.description.value.trim()
    };

    if (!productData.name || !productData.category || !productData.price || !productData.description) {
        setAdminMessage("Completa todos los campos del producto simulado.");
        return;
    }

    if (activeProductFormMode === "edit" && activeProductCard) {
        applyProductDataToCard(activeProductCard, productData);
        setAdminMessage("Producto actualizado correctamente (simulado).");
    } else {
        productList.appendChild(createProductCard(productData));
        setAdminMessage("Producto agregado correctamente (simulado).");
    }

    closeProductForm();
    filterProducts();
}

function handleProductDelete(productName, productCard) {
    const confirmed = window.confirm("¿Seguro que deseas eliminar este producto? Esta acción es simulada.");

    if (!confirmed) {
        return;
    }

    if (productCard) {
        productCard.dataset.deleted = "true";
        productCard.hidden = true;
    }

    setAdminMessage(`Producto eliminado correctamente (simulado): ${productName}.`);
}

function showProductDetail(productCard) {
    const productData = getProductDataFromCard(productCard);

    if (!productData) {
        return;
    }

    setAdminMessage(`Detalle simulado: ${productData.name} | ${productData.category} | ${productData.price} | Existencia: ${productData.stock} | Estado: ${productData.status}.`);
}

function filterProducts() {
    const productList = document.getElementById("admin-product-list");
    const searchInput = document.getElementById("admin-product-search");
    const categoryFilter = document.getElementById("admin-category-filter");
    const statusFilter = document.getElementById("admin-status-filter");

    if (!productList) {
        return;
    }

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const selectedStatus = statusFilter ? statusFilter.value : "all";

    productList.querySelectorAll(".admin-product-card").forEach(function (productCard) {
        if (productCard.hidden && productCard.dataset.deleted === "true") {
            return;
        }

        const name = (productCard.dataset.productName || "").toLowerCase();
        const category = productCard.dataset.productCategory || "";
        const status = productCard.dataset.productStatus || "";
        const matchesSearch = !searchTerm || name.includes(searchTerm);
        const matchesCategory = selectedCategory === "all" || category === selectedCategory;
        const matchesStatus = selectedStatus === "all" || status === selectedStatus;

        productCard.hidden = !(matchesSearch && matchesCategory && matchesStatus);
    });
}

function initAdminProductManager() {
    const addProductButton = document.getElementById("admin-add-product");
    const cancelProductButton = document.getElementById("admin-cancel-product");
    const productForm = document.getElementById("admin-product-form");
    const productList = document.getElementById("admin-product-list");
    const searchInput = document.getElementById("admin-product-search");
    const categoryFilter = document.getElementById("admin-category-filter");
    const statusFilter = document.getElementById("admin-status-filter");
    const productImage = document.getElementById("admin-product-image");

    if (!productForm || !productList) {
        return;
    }

    if (addProductButton) {
        addProductButton.addEventListener("click", function () {
            activeProductCard = null;
            showAdminSection("admin-products");
            openProductForm("add", null);
        });
    }

    if (cancelProductButton) {
        cancelProductButton.addEventListener("click", closeProductForm);
    }

    productForm.addEventListener("submit", handleProductFormSubmit);

    productList.addEventListener("click", function (event) {
        const detailButton = event.target.closest(".admin-detail-product");
        const editButton = event.target.closest(".admin-edit-product");
        const deleteButton = event.target.closest(".admin-delete-product");
        const productCard = event.target.closest(".admin-product-card");

        if (!productCard) {
            return;
        }

        if (detailButton) {
            showProductDetail(productCard);
        } else if (editButton) {
            activeProductCard = productCard;
            openProductForm("edit", getProductDataFromCard(productCard));
        } else if (deleteButton) {
            handleProductDelete(productCard.dataset.productName || "Producto", productCard);
        }
    });

    [searchInput, categoryFilter, statusFilter].forEach(function (control) {
        if (control) {
            control.addEventListener("input", filterProducts);
            control.addEventListener("change", filterProducts);
        }
    });

    if (productImage) {
        productImage.addEventListener("input", function () {
            const elements = getProductFormElements();

            if (elements && elements.imagePreview) {
                elements.imagePreview.textContent = productImage.value.trim() || "Vista previa simulada";
            }
        });
    }
}

let activePromotionCode = null;

function syncPromotionFormFields() {
    const scopeInput = document.getElementById("admin-promotion-scope");
    const targetInput = document.getElementById("admin-promotion-target");
    const percentInput = document.getElementById("admin-promotion-percent");

    if (!scopeInput || !targetInput || !percentInput) {
        return;
    }

    const isVisualBenefit = scopeInput.value === "benefit";
    const hasNoAgentTarget = scopeInput.value === "cart" || isVisualBenefit;
    targetInput.disabled = hasNoAgentTarget;
    targetInput.parentElement.classList.toggle("is-disabled", hasNoAgentTarget);
    percentInput.disabled = isVisualBenefit;
    percentInput.parentElement.classList.toggle("is-disabled", isVisualBenefit);

    if (isVisualBenefit) {
        percentInput.value = "0";
    } else if (Number(percentInput.value) < 1) {
        percentInput.value = "10";
    }
}

function renderAdminPromotions() {
    const promotionGrid = document.getElementById("admin-promotion-grid");

    if (!promotionGrid) {
        return;
    }

    promotionGrid.replaceChildren();

    getPromotions().forEach(function (promotion) {
        const promotionCard = document.createElement("article");
        const title = document.createElement("h3");
        const details = document.createElement("p");
        const description = document.createElement("p");
        const footer = document.createElement("div");
        const status = document.createElement("span");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");
        const scopeLabel = promotion.scope === "cart"
            ? "todo el carrito"
            : promotion.scope === "benefit"
                ? "beneficio visual"
                : promotion.target;

        promotionCard.className = "admin-promotion-card";
        promotionCard.dataset.promotionCode = promotion.code;
        title.textContent = promotion.name;
        details.textContent = promotion.scope === "benefit"
            ? `Código ${promotion.code}. Beneficio visual para ${promotion.target}.`
            : `Código ${promotion.code}. ${promotion.percent}% de descuento para ${scopeLabel}.`;
        description.className = "admin-promotion-description";
        description.textContent = promotion.description || "Promoción simulada administrable desde este panel.";
        footer.className = "admin-promotion-footer";
        status.className = `admin-status ${promotion.active ? "active" : "pending"}`;
        status.textContent = promotion.active ? "Activa" : "Pausada";
        actions.className = "admin-promotion-actions";
        editButton.type = "button";
        editButton.className = "admin-action-button admin-edit-promotion";
        editButton.textContent = "Editar";
        deleteButton.type = "button";
        deleteButton.className = "admin-action-button danger admin-delete-promotion";
        deleteButton.textContent = "Eliminar";

        actions.append(editButton, deleteButton);
        footer.append(status, actions);
        promotionCard.append(title, details, description, footer);
        promotionGrid.appendChild(promotionCard);
    });

    if (promotionGrid.children.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "admin-empty-promotions";
        emptyMessage.textContent = "No hay promociones disponibles. Puedes crear una nueva promoción simulada.";
        promotionGrid.appendChild(emptyMessage);
    }
}

function openAdminPromotionForm(mode, promotion) {
    const promotionForm = document.getElementById("admin-promotion-form");
    const formTitle = document.getElementById("admin-promotion-form-title");
    const saveButton = document.getElementById("admin-save-promotion");

    if (!promotionForm) {
        return;
    }

    promotionForm.reset();
    activePromotionCode = mode === "edit" && promotion ? promotion.code : null;

    if (formTitle) {
        formTitle.textContent = mode === "edit" ? "Editar promoción simulada" : "Crear promoción simulada";
    }

    if (saveButton) {
        saveButton.textContent = mode === "edit" ? "Actualizar promoción" : "Guardar promoción";
    }

    if (promotion) {
        document.getElementById("admin-promotion-name").value = promotion.name;
        document.getElementById("admin-promotion-code").value = promotion.code;
        document.getElementById("admin-promotion-scope").value = promotion.scope;
        document.getElementById("admin-promotion-target").value = promotion.scope === "product" ? promotion.target : "Agente Inicio";
        document.getElementById("admin-promotion-percent").value = String(promotion.percent);
        document.getElementById("admin-promotion-status").value = promotion.active ? "Activa" : "Pausada";
        document.getElementById("admin-promotion-description").value = promotion.description;
    }

    syncPromotionFormFields();
    promotionForm.hidden = false;
    promotionForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAdminPromotionForm() {
    const promotionForm = document.getElementById("admin-promotion-form");

    if (!promotionForm) {
        return;
    }

    promotionForm.reset();
    promotionForm.hidden = true;
    activePromotionCode = null;
    syncPromotionFormFields();
}

function initAdminPanel() {
    const quickActions = document.querySelectorAll(".admin-quick-action");
    const customerButtons = document.querySelectorAll(".admin-customer-detail");
    const reportButton = document.getElementById("admin-download-report");
    const createPromotionButton = document.getElementById("admin-create-promo");
    const promotionForm = document.getElementById("admin-promotion-form");
    const cancelPromotionButton = document.getElementById("admin-cancel-promotion");
    const promotionScope = document.getElementById("admin-promotion-scope");
    const promotionTarget = document.getElementById("admin-promotion-target");

    if (adminMenuButtons.length > 0 && adminSections.length > 0) {
        adminMenuButtons.forEach(function (adminMenuButton) {
            adminMenuButton.addEventListener("click", function (event) {
                showAdminSection(event.currentTarget.dataset.adminSection);
            });
        });
    }

    quickActions.forEach(function (quickAction) {
        quickAction.addEventListener("click", function (event) {
            const action = event.currentTarget.dataset.adminAction;

            if (action === "add-product") {
                showAdminSection("admin-products");
                activeProductCard = null;
                openProductForm("add", null);
            } else if (action === "view-orders") {
                showAdminSection("admin-orders");
                setAdminMessage("Mostrando pedidos simulados.");
            } else if (action === "create-promotion") {
                showAdminSection("admin-promotions");
                openAdminPromotionForm("add", null);
            }
        });
    });

    if (createPromotionButton && promotionForm) {
        createPromotionButton.addEventListener("click", function () {
            openAdminPromotionForm("add", null);
            setAdminMessage("Completa el formulario para simular una promoción.");
        });
    }

    if (promotionForm) {
        promotionForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const promotionName = document.getElementById("admin-promotion-name");
            const promotionCode = document.getElementById("admin-promotion-code");
            const promotionPercent = document.getElementById("admin-promotion-percent");
            const promotionStatus = document.getElementById("admin-promotion-status");
            const promotionDescription = document.getElementById("admin-promotion-description");
            const isEditing = Boolean(activePromotionCode);
            const promotionData = {
                name: promotionName ? promotionName.value.trim() : "Promoción simulada",
                code: promotionCode ? promotionCode.value.trim().toUpperCase() : "",
                scope: promotionScope ? promotionScope.value : "product",
                target: promotionScope && promotionScope.value === "cart"
                    ? "Carrito completo"
                    : promotionScope && promotionScope.value === "benefit"
                        ? "Nuevos negocios"
                        : (promotionTarget ? promotionTarget.value : ""),
                percent: promotionScope && promotionScope.value === "benefit" ? 0 : (promotionPercent ? Number(promotionPercent.value) : 10),
                active: !promotionStatus || promotionStatus.value === "Activa",
                description: promotionDescription ? promotionDescription.value.trim() : ""
            };

            if (!promotionData.code || !Number.isFinite(promotionData.percent)) {
                setAdminMessage("Completa el código y porcentaje de la promoción simulada.");
                return;
            }

            const codeBelongsToAnotherPromotion = getPromotions().some(function (promotion) {
                return promotion.code === promotionData.code && promotion.code !== activePromotionCode;
            });

            if (codeBelongsToAnotherPromotion) {
                setAdminMessage("Ya existe otra promoción con ese código. Usa un código diferente.");
                return;
            }

            if (isEditing && activePromotionCode !== promotionData.code) {
                deletePromotion(activePromotionCode);
            }

            savePromotion(promotionData);
            renderAdminPromotions();
            closeAdminPromotionForm();
            setAdminMessage(isEditing
                ? "Promoción actualizada correctamente (simulado)."
                : "Promoción guardada correctamente (simulado). Ya puede aplicarse en el carrito.");
        });
    }

    if (promotionScope && promotionTarget) {
        promotionScope.addEventListener("change", syncPromotionFormFields);
    }

    if (cancelPromotionButton && promotionForm) {
        cancelPromotionButton.addEventListener("click", function () {
            const wasEditing = Boolean(activePromotionCode);
            closeAdminPromotionForm();
            setAdminMessage(wasEditing
                ? "Edición de promoción cancelada (simulado)."
                : "Creación de promoción cancelada (simulado).");
        });
    }

    const promotionGrid = document.getElementById("admin-promotion-grid");

    if (promotionGrid) {
        promotionGrid.addEventListener("click", function (event) {
            const promotionCard = event.target.closest(".admin-promotion-card");

            if (!promotionCard) {
                return;
            }

            const promotionCode = promotionCard.dataset.promotionCode;
            const promotion = getPromotions().find(function (savedPromotion) {
                return savedPromotion.code === promotionCode;
            });

            if (event.target.closest(".admin-edit-promotion") && promotion) {
                openAdminPromotionForm("edit", promotion);
                setAdminMessage(`Editando ${promotion.name} (simulado).`);
            } else if (event.target.closest(".admin-delete-promotion") && promotion) {
                const confirmed = window.confirm("¿Seguro que deseas eliminar esta promoción? Esta acción es simulada.");

                if (confirmed) {
                    deletePromotion(promotion.code);
                    renderAdminPromotions();
                    closeAdminPromotionForm();
                    setAdminMessage("Promoción eliminada correctamente (simulado).");
                }
            }
        });
    }

    renderAdminPromotions();

    customerButtons.forEach(function (customerButton) {
        customerButton.addEventListener("click", function () {
            setAdminMessage("Detalle de cliente disponible próximamente (simulado).");
        });
    });

    if (reportButton) {
        reportButton.addEventListener("click", function () {
            setAdminMessage("Reporte generado correctamente (simulado).");
        });
    }
}

initAdminPanel();
initAdminProductManager();

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
const USERS_STORAGE_KEY = "ecoreUsers";
const SESSION_STORAGE_KEY = "ecoreSession";
const SERVICE_PUBLICATIONS_STORAGE_KEY = "ecoreServicePublications";

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

function getRegisteredUsers() {
    try {
        const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
        const users = Array.isArray(storedUsers) ? storedUsers : [];
        const legacyUser = readStoredUser(USER_STORAGE_KEY);

        if (legacyUser && legacyUser.email && !users.some(function (user) {
            return user.email === legacyUser.email;
        })) {
            users.push(legacyUser);
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }

        return users;
    } catch (error) {
        return [];
    }
}

function getAuthRedirect(defaultPage) {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const allowedPages = ["profile.html", "publish-service.html", "my-publications.html", "services.html"];
    const redirectPage = redirect ? redirect.split("?")[0] : "";
    return allowedPages.includes(redirectPage) ? redirect : defaultPage;
}

function preserveAuthRedirectLinks() {
    const redirect = new URLSearchParams(window.location.search).get("redirect");

    if (!redirect) {
        return;
    }

    document.querySelectorAll('a[href="register.html"], a[href="login.html"]').forEach(function (authLink) {
        const targetPage = authLink.getAttribute("href");
        authLink.href = `${targetPage}?redirect=${encodeURIComponent(redirect)}`;
    });
}

function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const registerMessage = document.getElementById("register-message");
    const user = { name, email };
    const registeredUsers = getRegisteredUsers();

    if (registeredUsers.some(function (registeredUser) {
        return registeredUser.email === email;
    })) {
        registerMessage.textContent = "Ya existe un usuario registrado con ese correo.";
        registerMessage.classList.add("message-error");
        return;
    }

    registeredUsers.push(user);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(registeredUsers));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));

    registerMessage.classList.remove("message-error");
    registerMessage.textContent = "Registro exitoso (simulado). Iniciando sesión...";
    window.setTimeout(function () {
        window.location.href = getAuthRedirect("profile.html");
    }, 650);
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const loginMessage = document.getElementById("login-message");
    const registeredUser = getRegisteredUsers().find(function (user) {
        return user.email === email;
    });

    const sessionUser = registeredUser || {
        name: "Usuario demo",
        email
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    loginMessage.classList.remove("message-error");
    window.location.href = getAuthRedirect("profile.html");
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

function updateAuthNavigation() {
    const sessionUser = readStoredUser(SESSION_STORAGE_KEY);

    if (!sessionUser) {
        return;
    }

    document.querySelectorAll(".logo").forEach(function (logo) {
        let userName = logo.querySelector(".user-nav-name");

        if (!userName) {
            userName = document.createElement("span");
            userName.className = "user-nav-name";
            logo.appendChild(userName);
        }

        userName.textContent = String(sessionUser.name || "Usuario");
    });

    document.querySelectorAll('nav[aria-label="Navegación principal"]').forEach(function (navigation) {
        navigation.querySelectorAll('a[href^="register.html"], a[href^="login.html"]').forEach(function (authLink) {
            authLink.remove();
        });

        if (!navigation.querySelector('a[href="profile.html"]')) {
            const profileLink = document.createElement("a");
            profileLink.href = "profile.html";
            profileLink.textContent = "Perfil";
            navigation.appendChild(profileLink);
        }
    });
}

function handleLogout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.location.href = "index.html";
}

function handleRecovery(event) {
    event.preventDefault();

    const recoveryEmail = document.getElementById("recovery-email");
    const recoveryMessage = document.getElementById("recovery-message");
    const recoveryModal = document.getElementById("recovery-modal");

    if (!recoveryEmail || !recoveryMessage || !recoveryEmail.value.trim()) {
        return;
    }

    recoveryMessage.textContent = "Contraseña enviada a correo (simulado).";
    recoveryMessage.classList.remove("message-error");

    if (recoveryModal) {
        recoveryModal.hidden = false;
        document.body.classList.add("modal-open");

        const loginLink = recoveryModal.querySelector("a[href=\"login.html\"]");
        if (loginLink) {
            loginLink.focus();
        }
    }
}

function closeRecoveryModal() {
    const recoveryModal = document.getElementById("recovery-modal");

    if (!recoveryModal) {
        return;
    }

    recoveryModal.hidden = true;
    document.body.classList.remove("modal-open");
}

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const recoveryForm = document.getElementById("recovery-form");
const recoveryCloseButtons = document.querySelectorAll("[data-recovery-close]");

if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
}

if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
}

if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
}

if (recoveryForm) {
    recoveryForm.addEventListener("submit", handleRecovery);
}

recoveryCloseButtons.forEach(function (recoveryCloseButton) {
    recoveryCloseButton.addEventListener("click", closeRecoveryModal);
});

document.addEventListener("keydown", function (event) {
    const recoveryModal = document.getElementById("recovery-modal");

    if (event.key === "Escape" && recoveryModal && !recoveryModal.hidden) {
        closeRecoveryModal();
    }
});

preserveAuthRedirectLinks();
loadProfile();
updateAuthNavigation();

const DEFAULT_SERVICE_PUBLICATIONS = [
    {
        id: "demo-context",
        ownerEmail: "ana.demo@ecore.mx",
        ownerName: "Ana Torres",
        title: "Contexto completo para negocios de servicios",
        price: 750,
        description: "Configuro servicios, precios, horarios, políticas, preguntas frecuentes y tono de atención para que el agente responda como tu negocio.",
        category: "context",
        delivery: "3 a 5 días",
        photo: "landing.png",
        capabilities: ["Servicios, costos, horarios y forma de trabajo", "Contexto, preguntas frecuentes y tono de atención", "Historial conversacional y sugerencias de contexto"],
        createdAt: "2026-07-01T12:00:00.000Z"
    },
    {
        id: "demo-whatsapp",
        ownerEmail: "carlos.demo@ecore.mx",
        ownerName: "Carlos Méndez",
        title: "Automatización de citas y seguimiento por WhatsApp",
        price: 1100,
        description: "Organizo agenda, confirmaciones, recordatorios y seguimiento de conversaciones para reducir citas perdidas.",
        category: "whatsapp",
        delivery: "1 semana",
        photo: "landing.png",
        capabilities: ["Recordatorios y seguimiento por WhatsApp", "Agenda y confirmación de citas", "Alertas y reportes de actividad"],
        createdAt: "2026-07-02T12:00:00.000Z"
    },
    {
        id: "demo-training",
        ownerEmail: "sofia.demo@ecore.mx",
        ownerName: "Sofía Ramírez",
        title: "Entrenamiento y flujos avanzados del agente",
        price: 1450,
        description: "Reviso conversaciones, mejoro el contexto y preparo flujos personalizados con supervisión para automatizaciones avanzadas.",
        category: "training",
        delivery: "1 semana",
        photo: "landing.png",
        capabilities: ["Autoaprendizaje supervisado", "Flujos personalizados y automatizaciones", "Transcripción, respuestas en audio y llamadas"],
        createdAt: "2026-07-03T12:00:00.000Z"
    }
];

function normalizeServicePublication(publication) {
    if (!publication || !publication.id || !publication.ownerEmail || !publication.title) {
        return null;
    }

    return {
        id: String(publication.id),
        ownerEmail: String(publication.ownerEmail).trim().toLowerCase(),
        ownerName: String(publication.ownerName || "Usuario de ECore"),
        title: String(publication.title),
        price: Math.max(1, Number(publication.price) || 1),
        description: String(publication.description || ""),
        category: ["context", "automation", "whatsapp", "training"].includes(publication.category) ? publication.category : "context",
        delivery: String(publication.delivery || "A convenir"),
        photo: String(publication.photo || "landing.png"),
        capabilities: Array.isArray(publication.capabilities) ? publication.capabilities.map(String) : [],
        createdAt: String(publication.createdAt || new Date().toISOString())
    };
}

function getStoredServicePublications() {
    try {
        const storedPublications = JSON.parse(localStorage.getItem(SERVICE_PUBLICATIONS_STORAGE_KEY) || "[]");
        return Array.isArray(storedPublications) ? storedPublications.map(normalizeServicePublication).filter(Boolean) : [];
    } catch (error) {
        return [];
    }
}

function saveServicePublications(publications) {
    try {
        localStorage.setItem(SERVICE_PUBLICATIONS_STORAGE_KEY, JSON.stringify(publications));
        return true;
    } catch (error) {
        return false;
    }
}

function getAllServicePublications() {
    return DEFAULT_SERVICE_PUBLICATIONS.concat(getStoredServicePublications());
}

function getServiceCategoryLabel(category) {
    const categoryLabels = {
        context: "Contexto del negocio",
        automation: "Automatización",
        whatsapp: "WhatsApp y seguimiento",
        training: "Entrenamiento y mejora"
    };
    return categoryLabels[category] || categoryLabels.context;
}

function createServicePublicationCard(publication, editable) {
    const card = document.createElement("article");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const category = document.createElement("span");
    const title = document.createElement("h3");
    const provider = document.createElement("p");
    const description = document.createElement("p");
    const details = document.createElement("div");
    const price = document.createElement("strong");
    const delivery = document.createElement("span");
    const capabilityList = document.createElement("div");
    const actions = document.createElement("div");

    card.className = "service-publication-card";
    card.dataset.serviceCategory = publication.category;
    card.dataset.publicationId = publication.id;
    image.className = "service-publication-image";
    image.src = publication.photo || "landing.png";
    image.alt = `Imagen de ${publication.title}`;
    content.className = "service-publication-content";
    category.className = "service-category-label";
    category.textContent = getServiceCategoryLabel(publication.category);
    title.textContent = publication.title;
    provider.className = "service-provider";
    provider.textContent = `Publicado por ${publication.ownerName}`;
    description.className = "service-publication-description";
    description.textContent = publication.description;
    details.className = "service-publication-details";
    price.textContent = `${formatCurrency(publication.price)} por servicio`;
    delivery.textContent = `Entrega: ${publication.delivery}`;
    capabilityList.className = "service-capability-tags";

    publication.capabilities.slice(0, 3).forEach(function (capability) {
        const tag = document.createElement("span");
        tag.textContent = capability;
        capabilityList.appendChild(tag);
    });

    if (publication.capabilities.length > 3) {
        const extraTag = document.createElement("span");
        extraTag.textContent = `+${publication.capabilities.length - 3} opciones`;
        capabilityList.appendChild(extraTag);
    }

    actions.className = "service-publication-actions";

    if (editable) {
        const editLink = document.createElement("a");
        const deleteButton = document.createElement("button");
        editLink.className = "admin-action-button";
        editLink.href = `publish-service.html?id=${encodeURIComponent(publication.id)}`;
        editLink.textContent = "Editar";
        deleteButton.type = "button";
        deleteButton.className = "admin-action-button danger service-delete-publication";
        deleteButton.textContent = "Eliminar";
        actions.append(editLink, deleteButton);
    } else {
        const contactButton = document.createElement("button");
        contactButton.type = "button";
        contactButton.className = "admin-action-button service-contact-provider";
        contactButton.textContent = "Solicitar información";
        actions.appendChild(contactButton);
    }

    details.append(price, delivery);
    content.append(category, title, provider, description, details, capabilityList, actions);
    card.append(image, content);
    return card;
}

function renderServiceMarketplace() {
    const publicationList = document.getElementById("service-publication-list");
    const emptyState = document.getElementById("service-publication-empty");
    const categoryFilter = document.getElementById("service-category-filter");

    if (!publicationList || !emptyState) {
        return;
    }

    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const publications = getAllServicePublications().filter(function (publication) {
        return selectedCategory === "all" || publication.category === selectedCategory;
    });
    publicationList.replaceChildren();
    publications.forEach(function (publication) {
        publicationList.appendChild(createServicePublicationCard(publication, false));
    });
    emptyState.hidden = publications.length > 0;
}

function initServiceMarketplace() {
    const publicationList = document.getElementById("service-publication-list");
    const categoryFilter = document.getElementById("service-category-filter");
    const message = document.getElementById("service-marketplace-message");

    if (!publicationList) {
        return;
    }

    renderServiceMarketplace();

    if (categoryFilter) {
        categoryFilter.addEventListener("change", renderServiceMarketplace);
    }

    publicationList.addEventListener("click", function (event) {
        const contactButton = event.target.closest(".service-contact-provider");
        const card = event.target.closest(".service-publication-card");

        if (contactButton && card && message) {
            const publication = getAllServicePublications().find(function (item) {
                return item.id === card.dataset.publicationId;
            });
            message.textContent = publication
                ? `Solicitud enviada a ${publication.ownerName} (simulado).`
                : "Solicitud enviada correctamente (simulado).";
        }
    });
}

function getServicePageSession() {
    const sessionUser = readStoredUser(SESSION_STORAGE_KEY);

    if (sessionUser) {
        return sessionUser;
    }

    const currentPage = `${window.location.pathname.split("/").pop()}${window.location.search}`;
    window.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}`);
    return null;
}

function readServicePhoto(file) {
    return new Promise(function (resolve, reject) {
        if (!file) {
            resolve("");
            return;
        }

        if (file.size > 1024 * 1024) {
            reject(new Error("La imagen debe pesar máximo 1 MB."));
            return;
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            reject(new Error("Selecciona una imagen JPG, PNG o WebP válida."));
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", function () {
            resolve(String(reader.result || ""));
        });
        reader.addEventListener("error", function () {
            reject(new Error("No fue posible leer la imagen seleccionada."));
        });
        reader.readAsDataURL(file);
    });
}

function initServicePublicationForm() {
    const form = document.getElementById("service-publication-form");

    if (!form) {
        return;
    }

    const sessionUser = getServicePageSession();

    if (!sessionUser) {
        return;
    }

    const publicationId = new URLSearchParams(window.location.search).get("id");
    const editingPublication = publicationId ? getStoredServicePublications().find(function (publication) {
        return publication.id === publicationId && publication.ownerEmail === sessionUser.email;
    }) : null;
    const formTitle = document.getElementById("service-form-title");
    const publishButton = document.getElementById("service-publish-button");
    const photoInput = document.getElementById("service-photo");
    const preview = document.getElementById("service-photo-preview");
    const previewImage = document.getElementById("service-photo-preview-image");
    const message = document.getElementById("service-form-message");
    let currentPhoto = editingPublication ? editingPublication.photo : "";

    if (publicationId && !editingPublication) {
        message.textContent = "No se encontró una publicación editable asociada a tu usuario.";
        form.querySelectorAll("input, select, textarea, button").forEach(function (control) {
            control.disabled = true;
        });
        return;
    }

    if (editingPublication) {
        formTitle.textContent = "Editar servicio publicado";
        publishButton.textContent = "Guardar cambios";
        document.getElementById("service-title").value = editingPublication.title;
        document.getElementById("service-price").value = String(editingPublication.price);
        document.getElementById("service-category").value = editingPublication.category;
        document.getElementById("service-delivery").value = editingPublication.delivery;
        document.getElementById("service-description").value = editingPublication.description;
        form.querySelectorAll("[name='serviceCapability']").forEach(function (checkbox) {
            checkbox.checked = editingPublication.capabilities.includes(checkbox.value);
        });
        previewImage.src = editingPublication.photo;
        preview.hidden = false;
    }

    photoInput.addEventListener("change", async function () {
        try {
            currentPhoto = await readServicePhoto(photoInput.files[0]);
            if (currentPhoto) {
                previewImage.src = currentPhoto;
                preview.hidden = false;
                message.textContent = "Vista previa de la foto cargada.";
            }
        } catch (error) {
            photoInput.value = "";
            currentPhoto = editingPublication ? editingPublication.photo : "";
            message.textContent = error.message;
        }
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const capabilities = Array.from(form.querySelectorAll("[name='serviceCapability']:checked")).map(function (checkbox) {
            return checkbox.value;
        });

        if (capabilities.length === 0) {
            message.textContent = "Selecciona por lo menos una opción de personalización.";
            return;
        }

        try {
            if (photoInput.files[0]) {
                currentPhoto = await readServicePhoto(photoInput.files[0]);
            }
        } catch (error) {
            message.textContent = error.message;
            return;
        }

        if (!currentPhoto) {
            message.textContent = "Selecciona una foto para la publicación.";
            return;
        }

        const publicationData = normalizeServicePublication({
            id: editingPublication ? editingPublication.id : `service-${Date.now()}`,
            ownerEmail: sessionUser.email,
            ownerName: sessionUser.name,
            title: document.getElementById("service-title").value.trim(),
            price: Number(document.getElementById("service-price").value),
            description: document.getElementById("service-description").value.trim(),
            category: document.getElementById("service-category").value,
            delivery: document.getElementById("service-delivery").value,
            photo: currentPhoto,
            capabilities: capabilities,
            createdAt: editingPublication ? editingPublication.createdAt : new Date().toISOString()
        });
        const nextPublications = getStoredServicePublications().filter(function (publication) {
            return publication.id !== publicationData.id;
        });
        nextPublications.push(publicationData);

        if (!saveServicePublications(nextPublications)) {
            message.textContent = "No fue posible guardar la publicación. Intenta usar una imagen más pequeña.";
            return;
        }

        message.textContent = editingPublication
            ? "Publicación actualizada correctamente (simulado)."
            : "Publicado (simulado). Ya aparece en Mis publicaciones.";
        window.setTimeout(function () {
            window.location.href = "my-publications.html";
        }, 900);
    });
}

function renderMyPublications(sessionUser) {
    const publicationList = document.getElementById("my-publication-list");
    const emptyState = document.getElementById("my-publication-empty");

    if (!publicationList || !emptyState) {
        return;
    }

    const publications = getStoredServicePublications().filter(function (publication) {
        return publication.ownerEmail === sessionUser.email;
    });
    publicationList.replaceChildren();
    publications.forEach(function (publication) {
        publicationList.appendChild(createServicePublicationCard(publication, true));
    });
    emptyState.hidden = publications.length > 0;
}

function initMyPublications() {
    const publicationList = document.getElementById("my-publication-list");

    if (!publicationList) {
        return;
    }

    const sessionUser = getServicePageSession();

    if (!sessionUser) {
        return;
    }

    const message = document.getElementById("my-publications-message");
    renderMyPublications(sessionUser);

    publicationList.addEventListener("click", function (event) {
        const deleteButton = event.target.closest(".service-delete-publication");
        const card = event.target.closest(".service-publication-card");

        if (!deleteButton || !card) {
            return;
        }

        const confirmed = window.confirm("¿Seguro que deseas eliminar esta publicación? Esta acción es simulada.");

        if (!confirmed) {
            return;
        }

        const remainingPublications = getStoredServicePublications().filter(function (publication) {
            return publication.id !== card.dataset.publicationId || publication.ownerEmail !== sessionUser.email;
        });
        saveServicePublications(remainingPublications);
        renderMyPublications(sessionUser);
        message.textContent = "Publicación eliminada correctamente (simulado).";
    });
}

initServiceMarketplace();
initServicePublicationForm();
initMyPublications();
