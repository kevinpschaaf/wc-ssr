window.ssrify = function(upgrade) {

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
        style.setAttribute('shadow-style', style.index);
        shadowStyleList.push(style);
      }
      var shadowStyle = document.createElement('shadow-style');
      shadowStyle.setAttribute('index', style.index);
      el.parentNode.replaceChild(shadowStyle, el);
    });
  }

  function replaceShadowRoot(el, clonedEl) {
    if (el.shadowRoot) {
      var shadowRoot = document.createElement('shadow-root');
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
    template.setAttribute('shadow-styles', '');
    list.forEach(function(style) {
      template.content.appendChild(style);
    });
    doc.querySelector('head').appendChild(template);
  }

  function registerShadowRoot() {
    var t = document.querySelector('template[shadow-styles]');
    var shadowStyles = t && t.content.children;
    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = function() {
      var parent = this.parentNode;
      if (parent) {
        var shadowRoot = parent.createShadowRoot();
        var child;
        while ((child = this.firstChild)) {
          if (child.localName == 'shadow-style') {
            child.remove();
            child = shadowStyles[child.getAttribute('index')].cloneNode(true);
          }
          shadowRoot.appendChild(child);
        }
        this.remove();
      }
    };
    document.registerElement('shadow-root', {prototype: proto});
  }

  function insertShadowRootRegistration(clonedDoc, upgrade) {
    var script = document.createElement('script');
    var openComment = upgrade ? '' : '/* Uncomment to upgrade:\n';
    var closeComment = upgrade ? '' : '\n*/';
    script.textContent =
      openComment + '(' +
      registerShadowRoot.toString() +
      ')();' + closeComment;
    clonedDoc.querySelector('head').appendChild(script);
  }

  var doc = document.documentElement;
  var clonedDoc = doc.cloneNode(true);
  replaceShadowRoots(doc, clonedDoc);
  removeImports(clonedDoc);
  removeScripts(clonedDoc);
  insertBase(doc, clonedDoc);
  insertShadowStyles(clonedDoc, shadowStyleList);
  insertShadowRootRegistration(clonedDoc, upgrade);

  openDocument(clonedDoc);

};