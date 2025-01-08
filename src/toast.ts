interface ToastOptions {
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'danger' | 'none';
    elem?: HTMLElement | null;
    icon?: string;
}

export default function toast(title: string, message: string, options?: ToastOptions): HTMLElement {
    const { 
        duration = 3000, 
        type = 'info', 
        elem = document.getElementById('toast-container'), 
        icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon"><!--!Font Awesome Pro 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336c-13.3 0-24 10.7-24 24s10.7 24 24 24l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-8 0 0-88c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l24 0 0 64-24 0zm40-144a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>`
    } = options ?? {};
    if (!elem) {
        throw new Error('No toast container found');
    }
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('aria-role', 'alert');
    if (type !== 'none') toastEl.classList.add(type);

    const iconel = document.createElement('div');
    iconel.className = 'toast-icon';
    iconel.innerHTML = icon;
    iconel.setAttribute('aria-hidden', 'true');
    toastEl.appendChild(iconel);

    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.innerHTML = title;
    toastEl.appendChild(titleEl);

    const messageEl = document.createElement('p');
    messageEl.className = 'toast-message';
    messageEl.innerHTML = message;
    toastEl.appendChild(messageEl);

    const close = document.createElement('button');
    close.className = 'toast-close';
    close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="icon"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';
    close.setAttribute('aria-label', 'Close');
    close.onclick = () => {
        toastEl.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-100%)' }
        ], {
            duration: 200,
            easing: 'ease-in'
        }).onfinish = () => {
            toastEl.remove();
        };
    };
    toastEl.appendChild(close);

    if (duration > 0) {
        setTimeout(() => {
            toastEl.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-100%)' }
            ], {
                duration: 200,
                easing: 'ease-in'
            }).onfinish = () => {
                toastEl.remove();
            };
        }, duration);
    }

    elem.appendChild(toastEl);
    toastEl.animate([
        { transform: 'translateX(-100%)' },
        { transform: 'translateX(0)' }
    ], {
        duration: 200,
        easing: 'ease-out'
    });
    return toastEl;
}
function ready() {
    // add a toast container to the body
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    // add the container to the body
    document.body.appendChild(toastContainer);
}
document.addEventListener('DOMContentLoaded', ready);