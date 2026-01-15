/* DISPASO site script (robust + smooth)
   - No template strings for rendering
   - No inline onclick handlers
   - Uses event delegation for cart controls
*/

(function () {
  var STORAGE_KEY = 'dispasoCart';
  var cart = [];
  var currentPaymentMethod = null; // { method, type }

  // Product image mapping
  var productImages = {
    'energy-rush': './images/energy-rush.png',
    'cherry-burst': './images/cherry-burst.png',
    'citrus-kick': './images/citrus-kick.png'
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return (root || document).querySelectorAll(sel);
  }

  // closest() polyfill-ish for safety
  function closest(el, selector) {
    if (!el) return null;
    if (el.closest) return el.closest(selector);
    while (el) {
      if (el.matches && el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function loadCart() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    cart = raw ? safeParse(raw, []) : [];
    if (!Array.isArray(cart)) cart = [];
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      // ignore (private mode / blocked storage)
    }
  }

  function cartItemsCount() {
    var i, total = 0;
    for (i = 0; i < cart.length; i++) total += cart[i].quantity || 0;
    return total;
  }

  function cartTotal() {
    var i, total = 0;
    for (i = 0; i < cart.length; i++) {
      total += (cart[i].price || 0) * (cart[i].quantity || 0);
    }
    return total;
  }

  function findItem(id) {
    var i;
    for (i = 0; i < cart.length; i++) {
      if (cart[i].id === id) return cart[i];
    }
    return null;
  }

  function addToCart(id, name, price, image) {
    if (!id) return;
    var item = findItem(id);
    if (item) {
      item.quantity += 1;
    } else {
      cart.push({
        id: id,
        name: name || 'Item',
        price: parseFloat(price) || 0,
        quantity: 1,
        image: image || productImages[id] || './images/default-can.png'
      });
    }
    saveCart();
    renderCart();
    pulseBadge();
    
    // Show feedback
    showAddFeedback(name);
  }

  function removeFromCart(id) {
    var next = [];
    var i;
    for (i = 0; i < cart.length; i++) {
      if (cart[i].id !== id) next.push(cart[i]);
    }
    cart = next;
    saveCart();
    renderCart();
  }

  function changeQty(id, delta) {
    var item = findItem(id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart();
    renderCart();
  }

  function pulseBadge() {
    var badge = document.getElementById('header-cart-count');
    if (!badge) return;
    badge.style.animation = 'none';
    setTimeout(function () {
      badge.style.animation = 'pulse 0.5s ease';
    }, 10);
  }

  function renderCart() {
    var badge = document.getElementById('header-cart-count');
    var list = document.getElementById('cart-list');
    var empty = document.getElementById('cart-empty');
    var itemsCount = document.getElementById('cart-items-count');
    var totalEl = document.getElementById('cart-total');
    var toPaymentBtn = document.getElementById('to-payment');

    var count = cartItemsCount();
    if (badge) {
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (itemsCount) itemsCount.textContent = String(count);
    if (totalEl) totalEl.textContent = '₹' + cartTotal().toFixed(2);

    if (!list) return;

    // Clear list safely
    while (list.firstChild) list.removeChild(list.firstChild);

    if (cart.length === 0) {
      if (empty) empty.style.display = 'block';
      if (toPaymentBtn) toPaymentBtn.disabled = true;
      return;
    }

    if (empty) empty.style.display = 'none';
    if (toPaymentBtn) toPaymentBtn.disabled = false;

    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var li = document.createElement('li');
      li.className = 'cart-item';
      li.setAttribute('data-id', item.id);

      // Create cart item with image
      var itemContent = document.createElement('div');
      itemContent.className = 'cart-item-content';
      
      // Product image
      var imgContainer = document.createElement('div');
      imgContainer.className = 'cart-item-image-container';
      var img = document.createElement('img');
      img.className = 'cart-item-image';
      img.src = item.image || productImages[item.id] || './images/default-can.png';
      img.alt = item.name;
      img.width = 60;
      img.height = 60;
      imgContainer.appendChild(img);

      // Product info
      var info = document.createElement('div');
      info.className = 'cart-item-info';
      var nameEl = document.createElement('div');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;
      var priceEl = document.createElement('div');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = '₹' + (item.price || 0).toFixed(2) + ' each';
      info.appendChild(nameEl);
      info.appendChild(priceEl);

      itemContent.appendChild(imgContainer);
      itemContent.appendChild(info);

      // Controls
      var controls = document.createElement('div');
      controls.className = 'cart-item-controls';

      var qty = document.createElement('div');
      qty.className = 'quantity-control';

      var minus = document.createElement('button');
      minus.className = 'qty-btn';
      minus.type = 'button';
      minus.setAttribute('data-action', 'dec');
      minus.textContent = '-';

      var qtyText = document.createElement('span');
      qtyText.className = 'cart-item-quantity';
      qtyText.textContent = String(item.quantity);

      var plus = document.createElement('button');
      plus.className = 'qty-btn';
      plus.type = 'button';
      plus.setAttribute('data-action', 'inc');
      plus.textContent = '+';

      qty.appendChild(minus);
      qty.appendChild(qtyText);
      qty.appendChild(plus);

      var remove = document.createElement('button');
      remove.className = 'remove-item';
      remove.type = 'button';
      remove.setAttribute('data-action', 'remove');
      remove.textContent = 'Remove';

      controls.appendChild(qty);
      controls.appendChild(remove);

      li.appendChild(itemContent);
      li.appendChild(controls);
      list.appendChild(li);
    }
  }

  function showAddFeedback(productName) {
    // Create feedback element
    var feedback = document.createElement('div');
    feedback.className = 'cart-feedback';
    feedback.textContent = 'Added ' + productName + ' to cart!';
    feedback.style.cssText = 'position:fixed;top:100px;right:20px;background:#4CAF50;color:white;padding:1rem 2rem;border-radius:10px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
    
    // Add animation styles
    var style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    if (!document.querySelector('#feedback-animations')) {
      style.id = 'feedback-animations';
      document.head.appendChild(style);
    }
    
    feedback.style.animation = 'slideInRight 0.3s ease forwards';
    document.body.appendChild(feedback);
    
    // Remove after 2 seconds
    setTimeout(function() {
      feedback.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(function() {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 2000);
  }

  function openCart() {
    var overlay = document.getElementById('cart-overlay');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderCart();
  }

  function closeCart() {
    var overlay = document.getElementById('cart-overlay');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    switchStep('cart');
  }

  function switchStep(step) {
    var tabs = $all('.overlay-tab');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-step') === step) {
        tabs[i].classList.add('active');
      } else {
        tabs[i].classList.remove('active');
      }
    }
    
    var panels = $all('.cart-step');
    for (var j = 0; j < panels.length; j++) {
      if (panels[j].getAttribute('data-step-panel') === step) {
        panels[j].classList.add('step-active');
        panels[j].style.display = 'block';
      } else {
        panels[j].classList.remove('step-active');
        panels[j].style.display = 'none';
      }
    }
    
    if (step === 'payment') resetPaymentMethod();
  }

  function resetPaymentMethod() {
    currentPaymentMethod = null;
    var btns = $all('.payment-method-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    var forms = $all('.payment-form');
    for (var j = 0; j < forms.length; j++) forms[j].classList.remove('payment-form-active');
  }

  function selectPaymentMethod(method, type) {
    currentPaymentMethod = { method: method, type: type || null };

    var btns = $all('.payment-method-btn');
    for (var i = 0; i < btns.length; i++) {
      var m = btns[i].getAttribute('data-method');
      var t = btns[i].getAttribute('data-type');
      btns[i].classList.remove('active');
      if (m === method && (!type || t === type)) btns[i].classList.add('active');
    }

    var forms = $all('.payment-form');
    for (var j = 0; j < forms.length; j++) forms[j].classList.remove('payment-form-active');

    var activeForm = null;
    if (method === 'card') {
      activeForm = document.getElementById('card-payment-form');
      var title = document.getElementById('card-form-title');
      if (title) title.textContent = type === 'debit' ? 'Debit Card Details' : 'Credit Card Details';
    } else if (method === 'upi') {
      activeForm = document.getElementById('upi-payment-form');
    } else if (method === 'qr') {
      activeForm = document.getElementById('qr-payment-form');
    } else if (method === 'paypal') {
      activeForm = document.getElementById('paypal-payment-form');
    }

    if (activeForm) activeForm.classList.add('payment-form-active');
  }

  function validatePayment(type) {
    if (!currentPaymentMethod) {
      alert('Please select a payment method first.');
      return false;
    }
    if (cart.length === 0) {
      alert('Your cart is empty.');
      switchStep('cart');
      return false;
    }
    // basic check only (demo)
    return true;
  }

  function formatCardNumberInput(input) {
    var value = String(input.value || '').replace(/\s/g, '').replace(/\D/g, '');
    var out = '';
    for (var i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) out += ' ';
      out += value.charAt(i);
    }
    input.value = out.substring(0, 19);
  }

  function formatExpiryInput(input) {
    var value = String(input.value || '').replace(/\D/g, '');
    if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
    input.value = value.substring(0, 5);
  }

  function attach() {
    console.log('Script attaching...'); // Debug log
    
    // footer year
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());

    // load + render
    loadCart();
    renderCart();

    // Open cart
    var openBtn = document.getElementById('open-cart');
    if (openBtn) {
      console.log('Found open cart button'); // Debug log
      openBtn.addEventListener('click', function (e) { 
        e.preventDefault(); 
        openCart(); 
      });
    } else {
      console.log('Open cart button NOT found'); // Debug log
    }

    // Close cart (backdrop, x, buttons)
    var closeBtns = $all('[data-close="cart"]');
    for (var i = 0; i < closeBtns.length; i++) {
      closeBtns[i].addEventListener('click', function (e) { 
        e.preventDefault(); 
        closeCart(); 
      });
    }
    
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    // Tabs
    var tabs = $all('.overlay-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function (e) {
        e.preventDefault();
        var step = this.getAttribute('data-step');
        if (step) switchStep(step);
      });
    }

    // Continue to payment - FIXED VARIABLE NAME
    var toPaymentBtn = document.getElementById('to-payment');
    if (toPaymentBtn) {
      toPaymentBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (cart.length > 0) switchStep('payment');
      });
    }

    // Payment method buttons
    var pmBtns = $all('.payment-method-btn');
    for (var p = 0; p < pmBtns.length; p++) {
      pmBtns[p].type = 'button';
      pmBtns[p].addEventListener('click', function (e) {
        e.preventDefault();
        selectPaymentMethod(this.getAttribute('data-method'), this.getAttribute('data-type'));
      });
    }

    // Add to cart (buttons)
    var addBtns = $all('.add-to-cart');
    console.log('Found ' + addBtns.length + ' add to cart buttons'); // Debug log
    
    for (var a = 0; a < addBtns.length; a++) {
      addBtns[a].type = 'button';
      addBtns[a].addEventListener('click', function (e) {
        e.preventDefault();
        console.log('Add to cart clicked'); // Debug log
        var card = closest(this, '.product-card');
        if (!card) {
          console.log('No product card found');
          return;
        }
        
        // Get image from the product card
        var imgElement = card.querySelector('.can-img');
        var productImage = imgElement ? imgElement.src : productImages[card.getAttribute('data-id')];
        
        console.log('Adding product:', {
          id: card.getAttribute('data-id'),
          name: card.getAttribute('data-name'),
          price: card.getAttribute('data-price'),
          image: productImage
        });
        
        addToCart(
          card.getAttribute('data-id'),
          card.getAttribute('data-name'),
          card.getAttribute('data-price'),
          productImage
        );
      });
    }

    // Cart list actions (delegation)
    var cartList = document.getElementById('cart-list');
    if (cartList) {
      cartList.addEventListener('click', function (e) {
        var target = e.target;
        if (!target) return;
        var li = closest(target, '.cart-item');
        if (!li) return;
        var id = li.getAttribute('data-id');
        var action = target.getAttribute('data-action');
        if (!id || !action) return;
        if (action === 'inc') changeQty(id, 1);
        if (action === 'dec') changeQty(id, -1);
        if (action === 'remove') removeFromCart(id);
      });
    }

    // Payment forms
    function onSubmit(formId, type) {
      var form = document.getElementById(formId);
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validatePayment(type)) return;
        // demo processing
        setTimeout(function () {
          cart = [];
          saveCart();
          renderCart();
          switchStep('done');
        }, 600);
      });
    }
    
    onSubmit('card-payment-form', 'card');
    onSubmit('upi-payment-form', 'upi');
    onSubmit('qr-payment-form', 'qr');
    onSubmit('paypal-payment-form', 'paypal');

    // Input formatting
    var cardInput = document.getElementById('pay-card');
    if (cardInput) cardInput.addEventListener('input', function () { formatCardNumberInput(cardInput); });
    var expInput = document.getElementById('pay-exp');
    if (expInput) expInput.addEventListener('input', function () { formatExpiryInput(expInput); });

    // Smooth scroll (basic)
    var anchors = $all('a[href^="#"]');
    for (var s = 0; s < anchors.length; s++) {
      anchors[s].addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (!href || href === '#') return;
        var target = $(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // GO NOW
    var go = $('[data-scroll]');
    if (go) {
      go.addEventListener('click', function () {
        var targetSel = go.getAttribute('data-scroll');
        var target = targetSel ? $(targetSel) : null;
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    
    console.log('Script attached successfully'); // Debug log
  }

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    // DOM already loaded
    attach();
  }

  // pulse animation (required by badge)
  var style = document.createElement('style');
  style.textContent = '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}';
  document.head.appendChild(style);
})();