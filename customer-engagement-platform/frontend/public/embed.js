/*
 * Embed loader for the AI Customer Engagement Platform's Chat Widget.
 *
 * Any external website includes this file directly:
 *
 *   <script src="https://YOUR_DOMAIN/embed.js"></script>
 *
 * It creates a single iframe pointed at this same origin's /widget.html,
 * sized to exactly match the widget's own current footprint — a small
 * box around the launcher button while closed, the full chat window
 * while open (or fullscreen on a narrow/mobile viewport) — rather than
 * covering the whole page. Browsers treat an iframe as one opaque
 * hit-test target regardless of what's transparent inside it, so a
 * full-viewport iframe would block clicks on the rest of the host page
 * everywhere, even where the widget draws nothing; resizing to the
 * widget's real footprint is the standard way embeddable chat widgets
 * (Intercom, Crisp, Zendesk, etc.) avoid that.
 *
 * The widget (inside the iframe) posts its open/closed state and corner
 * position via `postMessage` — see ChatWidget.jsx — which is what drives
 * the resize/reposition below.
 *
 * Because the iframe's own origin is this platform's domain (not the
 * host page's), every request the widget makes (REST + Socket.io) is
 * same-origin from the widget's point of view — no CORS configuration
 * is needed on the backend to support embedding on a third-party site.
 */
(function () {
  var CONTAINER_ID = 'ai-cep-widget-frame';
  var MESSAGE_SOURCE = 'ai-cep-widget';
  var MOBILE_BREAKPOINT_PX = 600; // matches MUI's default `sm` breakpoint

  var CLOSED_SIZE = { width: 96, height: 96 };
  var OPEN_SIZE = { width: 404, height: 560 };

  if (document.getElementById(CONTAINER_ID)) return; // already embedded once

  var currentScript = document.currentScript;
  var baseUrl = (currentScript && currentScript.getAttribute('data-base-url')) || null;

  if (!baseUrl) {
    // Default to this script's own origin — the common case where the
    // widget is served from the same platform that hosts embed.js.
    var scriptSrc = currentScript && currentScript.src;
    if (scriptSrc) {
      var a = document.createElement('a');
      a.href = scriptSrc;
      baseUrl = a.origin;
    }
  }

  if (!baseUrl) return; // cannot determine where to load the widget from

  var widgetOrigin = new URL(baseUrl).origin;

  var iframe = document.createElement('iframe');
  iframe.id = CONTAINER_ID;
  iframe.src = baseUrl.replace(/\/$/, '') + '/widget.html';
  iframe.title = 'Chat widget';
  iframe.setAttribute(
    'style',
    [
      'position: fixed',
      'border: none',
      'z-index: 2147483647',
      'background: transparent',
      'color-scheme: normal',
      'bottom: 0',
      'right: 0',
    ].join(';'),
  );

  function applyLayout(isOpen, position) {
    var isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    var isLeft = position === 'BOTTOM_LEFT';

    iframe.style.left = isLeft ? '0' : '';
    iframe.style.right = isLeft ? '' : '0';

    if (isOpen && isMobile) {
      iframe.style.top = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      return;
    }

    var size = isOpen ? OPEN_SIZE : CLOSED_SIZE;
    iframe.style.top = '';
    iframe.style.bottom = '0';
    iframe.style.width = size.width + 'px';
    iframe.style.height = size.height + 'px';
  }

  applyLayout(false, 'BOTTOM_RIGHT');

  window.addEventListener('message', function (event) {
    if (event.origin !== widgetOrigin) return;
    var data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.type !== 'WIDGET_STATE') return;

    applyLayout(!!data.isOpen, data.position);
  });

  function mount() {
    document.body.appendChild(iframe);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }
})();
