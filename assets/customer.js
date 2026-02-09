const selectors = {
  customerAddresses: '[data-customer-addresses]',
  addressCountrySelect: '[data-address-country-select]',
  addressContainer: '[data-address]',
  toggleAddressButton: 'button[aria-expanded]',
  cancelAddressButton: 'button[type="reset"]',
  deleteAddressButton: 'button[data-confirm-message]',
};

const attributes = {
  expanded: 'aria-expanded',
  confirmMessage: 'data-confirm-message',
};

class CustomerAddresses {
  constructor() {
    this.elements = this._getElements();
    if (Object.keys(this.elements).length === 0) return;
    this._setupCountries();
    this._setupEventListeners();
  }

  _getElements() {
    const container = document.querySelector(selectors.customerAddresses);
    return container
      ? {
          container,
          addressContainer: container.querySelector(selectors.addressContainer),
          toggleButtons: document.querySelectorAll(selectors.toggleAddressButton),
          cancelButtons: container.querySelectorAll(selectors.cancelAddressButton),
          deleteButtons: container.querySelectorAll(selectors.deleteAddressButton),
          countrySelects: container.querySelectorAll(selectors.addressCountrySelect),
        }
      : {};
  }

  _setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector('AddressCountryNew', 'AddressProvinceNew', {
        hideElement: 'AddressProvinceContainerNew',
      });
      this.elements.countrySelects.forEach((select) => {
        const formId = select.dataset.formId;
        // eslint-disable-next-line no-new
        new Shopify.CountryProvinceSelector(`AddressCountry_${formId}`, `AddressProvince_${formId}`, {
          hideElement: `AddressProvinceContainer_${formId}`,
        });
      });
    }
  }

  _setupEventListeners() {
    this.elements.toggleButtons.forEach((element) => {
      element.addEventListener('click', this._handleAddEditButtonClick);
    });
    this.elements.cancelButtons.forEach((element) => {
      element.addEventListener('click', this._handleCancelButtonClick);
    });
    this.elements.deleteButtons.forEach((element) => {
      element.addEventListener('click', this._handleDeleteButtonClick);
    });
  }

  _toggleExpanded(target) {
    target.setAttribute(attributes.expanded, (target.getAttribute(attributes.expanded) === 'false').toString());
  }

  _handleAddEditButtonClick = ({ currentTarget }) => {
    this._toggleExpanded(currentTarget);
  };

  _handleCancelButtonClick = ({ currentTarget }) => {
    this._toggleExpanded(currentTarget.closest(selectors.addressContainer).querySelector(`[${attributes.expanded}]`));
  };

  _handleDeleteButtonClick = ({ currentTarget }) => {
    // eslint-disable-next-line no-alert
    if (confirm(currentTarget.getAttribute(attributes.confirmMessage))) {
      Shopify.postLink(currentTarget.dataset.target, {
        parameters: { _method: 'delete' },
      });
    }
  };
}


document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    function showTab(tabId, url) {
        tabContents.forEach(content => content.style.display = "none");
        tabs.forEach(tab => tab.classList.remove("active"));

        const tabElement = document.querySelector(`.tab-content#${tabId}`);
        if (tabElement) {
            tabElement.style.display = "block";
        }

        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add("active");
        }

        // Push state for navigation
        if (url) {
            history.pushState(null, "", url);
        }
    }

    // Default tab logic
    const currentUrl = window.location.href;
    if (currentUrl.includes("view=orders")) {
        setTimeout(() => showTab("orders-tab", "/account?view=orders"), 100);
    } else if (currentUrl.includes("/account/addresses")) {
        setTimeout(() => showTab("addresses-tab", "/account/addresses"), 100);
    } else {
        showTab("details-tab", "/account");
    }

    // Handle tab clicks
    tabs.forEach(tab => {
        tab.addEventListener("click", function (event) {
            event.preventDefault();
            const tabId = this.getAttribute("data-tab");
            let url = "/account"; 

            if (tabId === "orders-tab") {
                url = "/account?view=orders";
            } else if (tabId === "addresses-tab") {
                url = "/account/addresses";
            }

            window.location.href = url; // Force full reload to ensure content loads properly
        });
    });

    // Handle browser back/forward actions
    window.addEventListener("popstate", function () {
        window.location.reload(); // Force reload to reinitialize content
    });
});

 document.addEventListener("DOMContentLoaded", function () {
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    tabLinks.forEach((link) => {
      link.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent default link behavior
        
        let tabId = this.getAttribute("data-tab");

        // Hide all tab contents
        tabContents.forEach((content) => {
          content.style.display = "none";
        });

        // Show the selected tab content
        let activeTab = document.getElementById(tabId);
        if (activeTab) {
          activeTab.style.display = "block";
        }
      });
    });
  });
