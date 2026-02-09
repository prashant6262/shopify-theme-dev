class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
           //Start updateProductRecommendations
        const productRecommendationsElU = document.querySelector('cart-drawer product-recommendations');
        const productIdRU = productRecommendationsElU?.dataset.productId;
        updateProductRecommendations(productRecommendationsElU, productIdRU);
    //End updateProductRecommendations
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });
        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = '';
        if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if (typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
// drop down var
function updateProductRecommendations(productRecommendationsEl, productIdR) {
  if (!productRecommendationsEl || !productIdR) return;

  fetch(`/recommendations/products.json?product_id=${productIdR}&limit=3&intent=related`)
    .then((response) => response.json())
    .then(({ products }) => {
      if (!products.length) return;

      productRecommendationsEl.innerHTML = '';
      const useSlider = products.length > 2;

      const sliderContainer = document.createElement('div');
      sliderContainer.className = useSlider ? 'swiper product-swiper' : 'simple-grid';

      const wrapper = document.createElement('div');
      wrapper.className = useSlider
        ? 'swiper-wrapper'
        : 'grid overflow-nowrap product-grid grid--2-col';

      products.forEach((product) => {
        
        const altText = product.featured_image.alt || product.title;
        const hasMultipleVariants = product.variants.length > 1;
        const selectedVariant = product.variants.find(v => v.available) || product.variants[0];

        const variantOptions = product.variants
          .map(
            (variant) =>
              `<option 
                  value="${variant.id}" 
                  data-variant-price="${(variant.price / 100).toFixed(2)}"
                  data-available="${variant.available}"
                  ${variant.available ? '' : 'disabled'}
                  ${variant.id === selectedVariant.id ? 'selected' : ''}
                  title="${variant.available ? variant.title : 'Out of Stock'}"
              >
                ${variant.title} ${variant.available ? '' : '(Out of Stock)'}
              </option>`
          )
          .join('');

        const item = document.createElement('div');
        item.className = useSlider ? 'swiper-slide' : 'grid__item';

        item.innerHTML = `
          <div class="card-wrapper">
            <a href="${product.url}" class="full-unstyled-link">
              <div class="image-animation">
                <img src="${product.featured_image}" 
                     alt="${altText}" 
                     loading="lazy"
                     width="300" height="400"
                     class="motion-reduce" />
              </div>
            </a>
            <div class="card-information">
              <a href="${product.url}"><h3 class="card__heading h5">${product.title}</h3></a>
              <div class="price">
                <span class="price-item price-item--last price-item--sale">${(selectedVariant.price / 100).toFixed(2)} ${Shopify.currency?.active || 'USD'}</span>
              </div>

              ${
                hasMultipleVariants
                  ? `<select class="variant-select" aria-label="Select variant for ${product.title}">
                      ${variantOptions}
                    </select>`
                  : ''
              }

              <div class="quick-add">
                <button 
                  class="add-to-cart-btn btn button button--full-width button-hover-style quick-add__submit"
                  data-product-name="${product.title}"
                  ${!hasMultipleVariants ? `data-variant-id="${selectedVariant.id}"` : ''}
                  ${!selectedVariant.available ? 'disabled' : ''}
                >
                  ${!selectedVariant.available ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        `;

        wrapper.appendChild(item);
      });

      sliderContainer.appendChild(wrapper);
      productRecommendationsEl.appendChild(sliderContainer);
      productRecommendationsEl.classList.add('product-recommendations--loaded');

      // Variant change handler
      productRecommendationsEl.querySelectorAll('.variant-select').forEach((select) => {
        select.addEventListener('change', (e) => {
          const selectedOption = e.target.selectedOptions[0];
          const price = selectedOption.dataset.variantPrice;
          const available = selectedOption.dataset.available === 'true';
          const variantId = selectedOption.value;

          const container = e.target.closest('.card-information');
          const priceSpan = container.querySelector('.price span');
          const addToCartBtn = container.querySelector('.add-to-cart-btn');

          if (priceSpan) {
            priceSpan.textContent = `${price} ${Shopify.currency?.active || 'USD'}`;
          }

          if (addToCartBtn) {
            addToCartBtn.disabled = !available;
            addToCartBtn.textContent = available ? 'Add to Cart' : 'Out of Stock';
            addToCartBtn.dataset.variantId = variantId;
          }
        });
      });

      // Add to cart logic
      productRecommendationsEl.querySelectorAll('.add-to-cart-btn').forEach((button) => {
        button.addEventListener('click', () => {
          let variantId = button.dataset.variantId;

          if (!variantId) {
            const variantSelect = button.closest('.card-information').querySelector('.variant-select');
            variantId = variantSelect?.value;
          }

          if (!variantId) return;

          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: variantId,
              quantity: 1,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'recommendations', cartData: null });
              updateCartIconBubble();
              updateUpsellHeader(data);
            })
            .catch((err) => console.error('Add to cart failed:', err));
        });
      });

      if (useSlider) {
        new Swiper('.product-swiper', {
          slidesPerView: 2,
          spaceBetween: 25,
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          breakpoints: {
             200: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 2 },
          },
        });
      }
    })
    .catch((err) => console.error('Failed to load recommended products:', err));
}




function updateUpsellHeader (data){
   const productTitle = data.product_title;
                const newImageUrl = data.image;
                const imgElement = document.querySelector('.upsell__header-image .product-card img');
                const titleElement = document.querySelector('.upsell__header-info h4');
                const productTextTitle = document.querySelector('.title-product-text h3');
                  if (productTextTitle) {
                    productTextTitle.textContent = `Frequently bought with "${productTitle}"`;
                  }
                    // Replace the text content
                    if (titleElement) {
                      titleElement.textContent = productTitle;
                    }
                  // Replace the src if the image is found
                  if (imgElement) {
                    imgElement.src = newImageUrl;
                  }
}
function updateCartIconBubble() {
  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      const bubble = document.getElementById('cart-icon-bubble');
      if (bubble) {
        const countSpan = bubble.querySelector('.cart-count-bubble > span[aria-hidden="true"]');
        const visuallyHidden = bubble.querySelector('.cart-count-bubble > .visually-hidden');

        if (cart.item_count > 0) {
          if (countSpan) countSpan.textContent = cart.item_count;
          if (visuallyHidden) visuallyHidden.textContent = `${cart.item_count} items`;
          bubble.style.display = 'inline-flex';
        } else {
          if (countSpan) countSpan.textContent = '';
          if (visuallyHidden) visuallyHidden.textContent = '';
          bubble.style.display = 'none';
        }
      }
    })
    .catch(err => console.error('Failed to update cart icon bubble:', err));
}

//End updateProductRecommendations
// global render
const productRecommendationsElG = document.querySelector('cart-drawer product-recommendations');
const productIdRG = productRecommendationsElG?.dataset.productId;
updateProductRecommendations(productRecommendationsElG,productIdRG)


