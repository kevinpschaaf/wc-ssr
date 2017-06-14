const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Bring window and all window constructors into global scope
const dom = new JSDOM();
global.window = global;
global.document = dom.window.document;
Object.getOwnPropertyNames(dom.window)
  .filter(n=>((n.indexOf('_') !== 0) && (n[0] == n[0].toUpperCase())))
  .forEach(n=>global[n] = dom.window[n]);

global.MutationObserver = class {
  constructor(cb) {
    this.cb = cb;
    this._nodeMap = new Map();
  }
  observe(node) {
    this._nodeMap.set(node, setTimeout(_ => this.cb([])));
  }
  disconnect(node) {
    clearTimeout(this._nodeMap.get(node));
  }
}
const flush = function() {
  return Promise.all(openAsyncs).then(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        window.Polymer && Polymer.flush();
        if (openAsyncs.length) {
          flush().then(resolve);
        } else {
          resolve();
        }
      });
    });
  })
}
let openAsyncs = new Set();
global.fetch = url => {
  let promise = new Promise((resolve, reject) => {
    var request = new XMLHttpRequest();
    request.onerror = () => {
      openAsyncs.delete(promise);
      reject();
    };
    request.onload = () => {
      openAsyncs.delete(promise);
      resolve({
        json: () => Promise.resolve(request.responseText).then(JSON.parse)
      })
    };
    request.open('get', url);
    request.send();
  });
  openAsyncs.add(promise);
  return promise;
};
global.performance = {
  now() { return Date.now() }
}
const toCopy = ['addEventListener', 'removeEventListener', 'location'];
toCopy.forEach(n => {
  let val = dom.window[n];
  global[n] = typeof n == 'function' ? val.bind(dom.window) : val;
});
global.requestAnimationFrame = window.setTimeout;
global.cancelAnimationFrame = window.clearTimeout;
global.Element.prototype.insertAdjacentElement = function() {} // silence ce polyfill warning
global.Element.prototype.attachShadow = function() {
  this.shadowRoot = document.createDocumentFragment();
}
global.Node.prototype.getRootNode = function() {
  let node = this;
  let parent;
  while ((parent = node.parentNode)) {
    node = parent;
  }
  return node;
}
require('../../components/custom-elements/custom-elements.min.js');

const serialize = function(root) {

  const shadowStyleList = [];
  const shadowStyleMap = new Map();

  function replaceStyles(container) {
    let styles = container.querySelectorAll('style');
    Array.from(styles).forEach(function(el) {
      let style = shadowStyleMap.get(el.textContent);
      if (!style) {
        style = el;
        shadowStyleMap.set(style.textContent, style);
        style.index = shadowStyleList.length;
        style.setAttribute('s-s', style.index);
        shadowStyleList.push(style);
      }
      const shadowStyle = document.createElement('s-s');
      shadowStyle.setAttribute('index', style.index);
      el.parentNode.replaceChild(shadowStyle, el);
    });
  }

  function replaceShadowRoot(el, clonedEl) {
    if (el.shadowRoot) {
      const shadowRoot = document.createDocumentFragment();
      for (let e=el.shadowRoot.firstChild; e; e=e.nextSibling) {
        shadowRoot.appendChild(e.cloneNode(true));
      }
      replaceStyles(shadowRoot);
      replaceShadowRoots(el.shadowRoot, shadowRoot);
      const srElement = document.createElement('s-r');
      srElement.appendChild(shadowRoot);
      clonedEl.insertBefore(srElement, clonedEl.firstChild);
    }
  }

  function replaceShadowRoots(container, clonedContainer) {
    let elements = container.querySelectorAll('*');
    let clonedElements = clonedContainer.querySelectorAll('*');
    Array.from(elements).forEach(function(el, i) {
      replaceShadowRoot(el, clonedElements[i]);
    });
    return clonedContainer;
  }

  function createShadowStyles() {
    let template = document.createElement('template');
    template.setAttribute('s-s', '');
    shadowStyleList.forEach(function(style) {
      template.content.appendChild(style);
    });
    return template;
  }

  let reifyScript = function() {
    let t = document.querySelector('template[s-s]');
    let shadowStyles = t && t.content.children;
    let shadowRoots = document.querySelectorAll('s-r');
    for (let i=0; i<shadowRoots.length; i++) {
      let sr = shadowRoots[i];
      let parent = sr.parentNode;
      if (parent) {
        let shadowRoot = parent.attachShadow({mode:'open'});
        let child;
        while ((child = sr.firstChild)) {
          if (child.localName == 's-s') {
            child.remove();
            child = shadowStyles[child.getAttribute('index')].cloneNode(true);
          }
          shadowRoot.appendChild(child);
        }
        parent.removeChild(sr);
      }
    }
    document.body.hidden = false;
  }

  function createReifyScript() {
    let script = document.createElement('script');
    script.textContent = `(${reifyScript})()`;
    return script;
  }

  let isDocument = root instanceof Document;
  root = isDocument ? root.documentElement : root;
  let clonedRoot = root.cloneNode(true);
  replaceShadowRoot(root, clonedRoot);
  replaceShadowRoots(root, clonedRoot);
  let styles = createShadowStyles();
  let script = createReifyScript();
  if (isDocument) {
    clonedRoot.querySelector('head').appendChild(styles);
    clonedRoot.querySelector('body').appendChild(script);
    return clonedRoot.outerHTML;
  } else {
    let div = document.createElement('div');
    div.appendChild(styles);
    div.appendChild(clonedRoot);
    div.appendChild(script);
    return div.innerHTML;
  }
};

const ssrify = function(file, url) {
  dom.reconfigure({url});
  dom.window.document.documentElement.innerHTML = fs.readFileSync(file);
  return flush().then(() => serialize(dom.window.document));
}

module.exports = { serialize, ssrify }