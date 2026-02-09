class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');

    // Only proceed if <details> exists
    if (this.mainDetailsToggle) {
      const summary = this.mainDetailsToggle.querySelector('summary');
      this.content = summary ? summary.nextElementSibling : null;

      this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
      this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.mainDetailsToggle || !this.content) return;

    if (!this.animations) this.animations = this.content.getAnimations?.() || [];

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    if (!this.mainDetailsToggle) return;
    this.mainDetailsToggle.removeAttribute('open');

    const summary = this.mainDetailsToggle.querySelector('summary');
    if (summary) summary.setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
  }

  onToggle() {
    if (!this.mainDetailsToggle || !this.header) return;

    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
