window.ssrify = function(upgradeVersion) {

  var shadowStyleList = [];
  var shadowStyleMap = {};

  function removeScripts(container) {
    var scripts = container.querySelectorAll('script');
    [].slice.call(scripts).forEach(function(el) {
      el.remove();
    });
  }

  function removeImports(container) {
    var imports = container.querySelectorAll('link[rel=import]');
    [].slice.call(imports).forEach(function(el) {
      el.remove();
    });
  }

  function replaceStyles(container) {
    var styles = container.querySelectorAll('style');
    [].slice.call(styles).forEach(function(el) {
      var style = shadowStyleMap[el.textContent];
      if (!style) {
        style = el;
        shadowStyleMap[style.textContent] = style;
        style.index = shadowStyleList.length;
        style.setAttribute('s-s', style.index);
        shadowStyleList.push(style);
      }
      var shadowStyle = document.createElement('s-s');
      shadowStyle.setAttribute('index', style.index);
      el.parentNode.replaceChild(shadowStyle, el);
    });
  }

  function replaceShadowRoot(el, clonedEl) {
    if (el.shadowRoot) {
      var shadowRoot = document.createElement('s-r');
      for (var e=el.shadowRoot.firstChild; e; e=e.nextSibling) {
        shadowRoot.appendChild(e.cloneNode(true));
      }
      removeImports(shadowRoot);
      replaceStyles(shadowRoot);
      replaceShadowRoots(el.shadowRoot, shadowRoot);
      clonedEl.insertBefore(shadowRoot, clonedEl.firstChild);
    }
  }

  function replaceShadowRoots(container, clonedContainer) {
    var elements = container.querySelectorAll('*');
    var clonedElements = clonedContainer.querySelectorAll('*');
    [].slice.call(elements).forEach(function(el, i) {
      replaceShadowRoot(el, clonedElements[i]);
    });
    return clonedContainer;
  }

  function insertBase(doc, clonedDoc) {
    if (!doc.querySelector('base[href]')) {
      var base = document.createElement('base');
      base.href = doc.baseURI;
      var head = clonedDoc.querySelector('head');
      head.insertBefore(base, head.firstChild);
    }
  }

  function openDocument(doc) {
    var uri = "data:text/html," + encodeURIComponent(doc.outerHTML);
    var newWindow = window.open(uri);
  }

  function insertShadowStyles(doc, list) {
    var template = document.createElement('template');
    template.setAttribute('s-s', '');
    list.forEach(function(style) {
      template.content.appendChild(style);
    });
    doc.querySelector('head').appendChild(template);
  }

  let registerShadowRoot = {
    v0: function() {
      var t = document.querySelector('template[s-s]');
      var shadowStyles = t && t.content.children;
      var proto = Object.create(HTMLElement.prototype);
      proto.createdCallback = function() {
        var parent = this.parentNode;
        if (parent) {
          var shadowRoot = parent.createShadowRoot();
          var child;
          while ((child = this.firstChild)) {
            if (child.localName == 's-s') {
              child.remove();
              child = shadowStyles[child.getAttribute('index')].cloneNode(true);
            }
            shadowRoot.appendChild(child);
          }
          this.remove();
        }
      };
      document.registerElement('s-r', {prototype: proto});
    },
    v1: function() {
      var t = document.querySelector('template[s-s]');
      var shadowStyles = t && t.content.children;
      class SR extends HTMLElement {
        connectedCallback() {
          var parent = this.parentNode;
          if (parent) {
            var shadowRoot = parent.attachShadow({mode:'open'});
            var child;
            while ((child = this.firstChild)) {
              if (child.localName == 's-s') {
                child.remove();
                child = shadowStyles[child.getAttribute('index')].cloneNode(true);
              }
              shadowRoot.appendChild(child);
            }
            this.remove();
          }
        }
      }
      customElements.define('s-r', SR);
    }
  }

  function insertShadowRootRegistration(clonedDoc, upgradeVersion) {
    var script = document.createElement('script');
    var openComment = upgradeVersion ? '' : '/* Uncomment to upgrade:\n';
    var closeComment = upgradeVersion ? '' : '\n*/';
    var version = typeof upgradeVersion == 'string' ? upgradeVersion : 'v1';
    var register = registerShadowRoot[version];
    script.textContent =
      openComment + '(' +
      register.toString() +
      ')();' + closeComment;
    clonedDoc.querySelector('body').appendChild(script);
  }

  var doc = document.documentElement;
  var clonedDoc = doc.cloneNode(true);
  replaceShadowRoots(doc, clonedDoc);
  removeImports(clonedDoc);
  removeScripts(clonedDoc);
  insertBase(doc, clonedDoc);
  insertShadowStyles(clonedDoc, shadowStyleList);
  insertShadowRootRegistration(clonedDoc, upgradeVersion);

  openDocument(clonedDoc);

};